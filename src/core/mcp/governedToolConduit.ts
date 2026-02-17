import { readFile } from "fs/promises";
import { createHash } from "crypto";
import {
    OperationStatus,
    enforceReadOnly
} from "./governedOperation";
import {
    loadOps,
    deriveCurrentOps,
    updateOpStatus,
    findOriginalId
} from "./opLedgerStore";
import { isPathAllowed } from "./pathPolicy";

const MAX_CONTENT_BYTES = 100 * 1024; // 100KB default cap for storage

/**
 * Executes a governed read-only tool (fs.readFile) for a given operation.
 * Enforces all governance constraints and records the result in the ledger.
 * Uses deterministic caching to avoid re-executing successful tools for the same opId.
 */
export async function executeGovernedReadOnlyTool(
    opId: string,
    toolInput: { path: string; encoding?: "utf8" | "base64" }
) {
    const { path, encoding = "utf8" } = toolInput;
    const ledger = loadOps();

    // 1. Locate the operation by ID
    const targetRecord = ledger.find(o => o.id === opId);
    if (!targetRecord) {
        throw new Error(`Execution failed: Operation record ${opId} not found in ledger.`);
    }

    // 2. Derive current state for this lineage
    const currentOps = deriveCurrentOps(ledger);
    const lineageId = findOriginalId(targetRecord, ledger);
    const op = currentOps.find(o => findOriginalId(o, ledger) === lineageId);

    if (!op) {
        throw new Error(`Execution failed: Could not derive current state for lineage ${lineageId}.`);
    }

    // 3. Status checks
    enforceReadOnly(op);

    const toolName = op.proposal.toolName.toLowerCase();
    if (!["fs.readfile", "readfile", "reader"].includes(toolName)) {
        throw new Error(`Execution failed: Tool ${op.proposal.toolName} is not a valid read-only reader.`);
    }

    if (!op.request || !op.request.accepted) {
        throw new Error(`Execution failed: Operation ${opId} has no accepted execution request.`);
    }

    // 4. Path safety check
    const allowlist = op.proposal.constraints
        .filter(c => c.startsWith("allow:"))
        .map(c => c.replace("allow:", ""));

    if (allowlist.length === 0) {
        throw new Error(`Execution failed: No path allowlist constraints found for operation ${opId}.`);
    }

    if (!isPathAllowed(path, allowlist)) {
        throw new Error(`Execution failed: Path "${path}" is not in the permitted allowlist.`);
    }

    // 5. Deterministic Caching: Replay existing success result
    if (op.status === OperationStatus.Executed && op.result?.outcome === "success") {
        return op;
    }

    try {
        // 6. Execute Tool
        const contentBuffer = await readFile(path);
        const bytes = contentBuffer.length;
        const content = encoding === "base64"
            ? contentBuffer.toString("base64")
            : contentBuffer.toString("utf8");

        // 7. Generate Deterministic Hash
        const hash = createHash("sha256").update(contentBuffer).digest("hex");

        // 8. Store Result (with size-based cap)
        const storeContent = bytes <= MAX_CONTENT_BYTES;

        const resultData = {
            path,
            encoding,
            bytes,
            hash,
            content: storeContent ? content : undefined,
            contentPreview: content.slice(0, 500) + (content.length > 500 ? "..." : ""),
            omittedDueToSize: !storeContent
        };

        const updatedOps = updateOpStatus(opId, {
            status: OperationStatus.Executed,
            result: {
                completedAt: Date.now(),
                outcome: "success",
                data: resultData,
                appendOnlyHash: hash
            }
        });

        const nextCurrent = deriveCurrentOps(updatedOps);
        return nextCurrent.find(o => findOriginalId(o, updatedOps) === lineageId);

    } catch (err) {
        const e = err as { code?: string; message: string };
        // Record failure in ledger
        const failedOps = updateOpStatus(opId, {
            status: OperationStatus.Failed,
            result: {
                completedAt: Date.now(),
                outcome: "error" as const,
                data: { path },
                error: {
                    code: e.code || "TOOL_EXECUTION_ERROR",
                    message: e.message
                }
            }
        });

        // Record in ledger
        deriveCurrentOps(failedOps); // Ensure derived state is updated

        throw e; // Re-throw to inform caller, but record is now in ledger
    }
}
