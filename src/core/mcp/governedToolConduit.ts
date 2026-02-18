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

/**
 * Executes a governed read-only tool (fs.readFile) for a given operation.
 * BROWSER-SAFE STUB: In Phase 1, filesystem access is not available in the browser.
 * This function validates governance constraints and records a deterministic failure.
 * 
 * NOTE: This function does not throw on environment-related failures (BROWSER_UNSUPPORTED)
 * to ensure UI stability, but it will throw on missing ledger state or invalid metadata.
 */
export async function executeGovernedReadOnlyTool(
    opId: string,
    toolInput: { path: string; encoding?: "utf8" | "base64" }
) {
    const { path } = toolInput;
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

    // 5. Browser-safe failure recording
    const message = "Read-only filesystem tool requires server context (Phase 1: not available in browser).";

    const failedOps = updateOpStatus(opId, {
        status: OperationStatus.Failed,
        result: {
            completedAt: Date.now(),
            outcome: "error",
            data: { path },
            error: {
                code: "BROWSER_UNSUPPORTED",
                message
            }
        }
    });

    const nextCurrent = deriveCurrentOps(failedOps);
    const resultOp = nextCurrent.find(o => findOriginalId(o, failedOps) === lineageId);

    // Return the failed operation instead of throwing, per browser-safety requirements.
    return resultOp;
}
