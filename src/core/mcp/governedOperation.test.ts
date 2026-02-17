/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import type {
    GovernedOperation,
    ToolProposal
} from "./governedOperation";
import {
    OperationStatus,
    ToolMode,
    assertGovernedOperation,
    enforceReadOnly
} from "./governedOperation";
import {
    appendOp,
    loadOps,
    deriveCurrentOps,
    updateOpStatus
} from "./opLedgerStore";

describe("GovernedOperation Governance", () => {
    const validOp: GovernedOperation = {
        id: "OP-123",
        artifactId: "A-1",
        createdAt: Date.now(),
        status: OperationStatus.Proposed,
        mode: ToolMode.ReadOnly,
        proposal: {
            toolId: "t1",
            toolName: "Reader",
            intent: "Read some data",
            scope: ["src/"],
            constraints: ["read-only"],
            rationale: "Need context"
        },
        lineage: { sessionId: "s1", peerId: "p1" }
    };

    it("should validate a correct operation", () => {
        expect(() => assertGovernedOperation(validOp)).not.toThrow();
    });

    it("should fail validation for missing fields", () => {
        const invalid = { ...validOp, id: undefined };
        // @ts-ignore - purposefully passing invalid type
        expect(() => assertGovernedOperation(invalid)).toThrow();
    });

    it("should fail validation for invalid IDs", () => {
        const invalid = { ...validOp, id: "BAD-ID" };
        expect(() => assertGovernedOperation(invalid)).toThrow();
    });

    it("should enforce read-only policy", () => {
        expect(() => enforceReadOnly(validOp)).not.toThrow();
        const writeOp = { ...validOp, mode: ToolMode.Write as ToolMode };
        expect(() => enforceReadOnly(writeOp)).toThrow(/Phase 1 Error/);
    });
});

describe("OpLedgerStore (Append-Only)", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("should handle append-only updates via revision chaining", () => {
        const op: GovernedOperation = {
            id: "OP-1",
            artifactId: "A-1",
            createdAt: Date.now(),
            status: OperationStatus.Proposed,
            mode: ToolMode.ReadOnly,
            proposal: {
                toolId: "t1", toolName: "T", intent: "I", scope: [], constraints: [], rationale: "R"
            },
            lineage: {}
        };

        appendOp(op);
        expect(loadOps()).toHaveLength(1);

        updateOpStatus("OP-1", { status: OperationStatus.Requested });

        const ledger = loadOps();
        expect(ledger).toHaveLength(2);
        expect(ledger[1].previousId).toBe("OP-1");
        expect(ledger[1].status).toBe(OperationStatus.Requested);
    });

    it("should derive the current state from lineage", () => {
        const op1: GovernedOperation = {
            id: "OP-1",
            artifactId: "A-1",
            createdAt: 1000,
            status: OperationStatus.Proposed,
            mode: ToolMode.ReadOnly,
            proposal: { toolId: "t1", toolName: "T", intent: "P1", scope: [], constraints: [], rationale: "" },
            lineage: {}
        };
        const op2: GovernedOperation = {
            id: "OP-2",
            artifactId: "A-1",
            createdAt: 1001,
            status: OperationStatus.Proposed,
            mode: ToolMode.ReadOnly,
            proposal: { toolId: "t2", toolName: "T", intent: "P2", scope: [], constraints: [], rationale: "" },
            lineage: {}
        };

        appendOp(op1);
        appendOp(op2);
        updateOpStatus("OP-1", { status: OperationStatus.Requested });

        const ledger = loadOps();
        const current = deriveCurrentOps(ledger);
        expect(current).toHaveLength(2);

        // Find the one that corresponds to lineage of OP-1
        const derivedOp1 = current.find(o => {
            const originalId = o.previousId || o.id;
            return originalId === "OP-1";
        });
        expect(derivedOp1?.status).toBe(OperationStatus.Requested);
    });
});
