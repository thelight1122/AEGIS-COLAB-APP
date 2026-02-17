import type { GovernedOperation } from "./governedOperation";
import { assertGovernedOperation } from "./governedOperation";

const STORAGE_KEY = "aegis_ops_current-artifact";

/**
 * Loads the operations ledger from localStorage.
 */
export function loadOps(): GovernedOperation[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

/**
 * Appends a new operation record to the ledger.
 */
export function appendOp(op: GovernedOperation): GovernedOperation[] {
    assertGovernedOperation(op);
    const ops = loadOps();
    const next = [...ops, op];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
}

/**
 * Updates an operation by appending a new record that references the previous ID.
 * This maintains the append-only principle.
 */
export function updateOpStatus(
    opId: string,
    patch: Partial<Pick<GovernedOperation, 'status' | 'request' | 'result'>>
): GovernedOperation[] {
    const ops = loadOps();
    // Find the current version of this op
    const currentOps = deriveCurrentOps(ops);
    const existing = currentOps.find(o => o.id === opId);

    if (!existing) {
        throw new Error(`Cannot update unknown operation: ${opId}`);
    }

    const updated: GovernedOperation = {
        ...existing,
        ...patch,
        previousId: existing.previousId || existing.id, // Chain to the previous revision
        id: `OP-REV-${crypto.randomUUID()}` // Each record has a unique ID, but represents a state change
    };

    return appendOp(updated);
}

/**
 * Derives the current state of each operation from the append-only ledger.
 * It returns the latest record for each original operation ID lineage.
 */
export function deriveCurrentOps(ops: GovernedOperation[]): GovernedOperation[] {
    const latestMap = new Map<string, GovernedOperation>();

    // Process in order, later records supersede earlier ones in the same lineage
    for (const op of ops) {
        // Lineage is identified by the first original OP-uuid in the chain
        const lineageId = findOriginalId(op, ops);
        latestMap.set(lineageId, op);
    }

    return Array.from(latestMap.values());
}

/**
 * Helper to find the original ID in a revision chain.
 */
export function findOriginalId(op: GovernedOperation, allOps: GovernedOperation[]): string {
    if (!op.previousId) return op.id;

    // Simplification for Phase 1: if it looks like a revision ID, we treat it as part of a lineage.
    // In a mature system, we'd traverse previousId recursively or include a lineageId field.
    // Here we'll just check if the previousId is itself a revision.
    const prev = allOps.find(o => o.id === op.previousId);
    if (prev) {
        return findOriginalId(prev, allOps);
    }
    return op.previousId;
}
