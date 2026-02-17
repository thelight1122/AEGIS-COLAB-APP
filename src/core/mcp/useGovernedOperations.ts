import { useState, useCallback, useEffect } from "react";
import type {
    GovernedOperation,
    ToolProposal
} from "./governedOperation";
import {
    OperationStatus,
    ToolMode
} from "./governedOperation";
import {
    loadOps,
    appendOp,
    updateOpStatus,
    deriveCurrentOps
} from "./opLedgerStore";
import { executeGovernedReadOnlyTool } from "./governedToolConduit";

/**
 * Hook to manage and interact with governed operations.
 */
export function useGovernedOperations(artifactId: string) {
    const [ops, setOps] = useState<GovernedOperation[]>([]);

    // Sync status on mount and ledger changes
    useEffect(() => {
        const ledger = loadOps();
        const current = deriveCurrentOps(ledger);
        // Only update if current derived state differs to avoid render loops
        if (JSON.stringify(current) !== JSON.stringify(ops)) {
            setOps(current);
        }
    }, [ops]);

    const proposeReadOnlyToolCall = useCallback((proposal: ToolProposal, lineage: { sessionId?: string; peerId?: string }) => {
        const op: GovernedOperation = {
            id: `OP-${crypto.randomUUID()}`,
            artifactId,
            createdAt: Date.now(),
            status: OperationStatus.Proposed,
            mode: ToolMode.ReadOnly,
            proposal,
            lineage
        };

        const nextLedger = appendOp(op);
        setOps(deriveCurrentOps(nextLedger));
        return op.id;
    }, [artifactId]);

    const requestExecution = useCallback((opId: string, _peerId: string, parameters: Record<string, unknown>) => {
        const nextLedger = updateOpStatus(opId, {
            status: OperationStatus.Requested,
            request: {
                requestedAt: Date.now(),
                accepted: true, // Auto-accepting for Phase 1 demo/local context
                approvedBy: "self",
                parameters
            }
        });
        setOps(deriveCurrentOps(nextLedger));
    }, []);

    const executeReadOnlyFile = useCallback(async (opId: string, path: string) => {
        try {
            const updatedOp = await executeGovernedReadOnlyTool(opId, { path });
            if (updatedOp) {
                const ledger = loadOps();
                setOps(deriveCurrentOps(ledger));
            }
            return updatedOp;
        } catch (err) {
            // State is updated inside the conduit even on failure
            const ledger = loadOps();
            setOps(deriveCurrentOps(ledger));
            throw err;
        }
    }, []);

    const recordResult = useCallback((opId: string, outcome: "success" | "error", data: unknown) => {
        const nextLedger = updateOpStatus(opId, {
            status: OperationStatus.Executed,
            result: {
                completedAt: Date.now(),
                outcome,
                data
            }
        });
        setOps(deriveCurrentOps(nextLedger));
    }, []);

    return {
        ops,
        proposeReadOnlyToolCall,
        requestExecution,
        executeReadOnlyFile,
        recordResult
    };
}
