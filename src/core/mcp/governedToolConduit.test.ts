import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GovernedOperation } from "./governedOperation";
import {
    OperationStatus,
    ToolMode
} from "./governedOperation";
import { appendOp } from "./opLedgerStore";
import { executeGovernedReadOnlyTool } from "./governedToolConduit";

// Manual localStorage mock for node environment
const storageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; },
        removeItem: (key: string) => { delete store[key]; }
    };
})();

Object.defineProperty(global, "localStorage", { value: storageMock });

describe("GovernedToolConduit (Browser Sandbox)", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    const baseOp: GovernedOperation = {
        id: "OP-T1",
        artifactId: "A-1",
        createdAt: Date.now(),
        status: OperationStatus.Proposed,
        mode: ToolMode.ReadOnly,
        proposal: {
            toolId: "t1",
            toolName: "fs.readFile",
            intent: "Read fixture",
            scope: ["src/core/mcp/"],
            constraints: ["allow:src/core/mcp/__fixtures__/"],
            rationale: "Testing"
        },
        lineage: {}
    };

    it("should reject execution if request is missing", async () => {
        appendOp(baseOp);
        await expect(executeGovernedReadOnlyTool("OP-T1", { path: "any.txt" }))
            .rejects.toThrow(/no accepted execution request/);
    });

    it("should reject execution if path is not allowed", async () => {
        const acceptedOp: GovernedOperation = {
            ...baseOp,
            status: OperationStatus.Requested,
            request: {
                requestedAt: Date.now(),
                accepted: true,
                approvedBy: "self" as const,
                parameters: {}
            }
        };
        appendOp(acceptedOp);

        // Path outside allowlist
        await expect(executeGovernedReadOnlyTool("OP-T1", { path: "src/secret.ts" }))
            .rejects.toThrow(/not in the permitted allowlist/);
    });

    it("should record BROWSER_UNSUPPORTED failure and NOT throw", async () => {
        const fixturePath = "src/core/mcp/__fixtures__/hello.txt";
        const acceptedOp: GovernedOperation = {
            ...baseOp,
            status: OperationStatus.Requested,
            request: {
                requestedAt: Date.now(),
                accepted: true,
                approvedBy: "self" as const,
                parameters: {}
            }
        };
        appendOp(acceptedOp);

        // Should NOT throw
        const result = await executeGovernedReadOnlyTool("OP-T1", { path: fixturePath });

        expect(result?.status).toBe(OperationStatus.Failed);
        expect(result?.result?.outcome).toBe("error");
        expect(result?.result?.error?.code).toBe("BROWSER_UNSUPPORTED");

        // Check ledger for persistence
        const ledgerRaw = localStorage.getItem("aegis_ops_current-artifact");
        const ops = JSON.parse(ledgerRaw || "[]");
        const latest = ops[ops.length - 1];

        expect(latest.status).toBe(OperationStatus.Failed);
        expect(latest.result.error.message).toContain("requires server context");
    });
});
