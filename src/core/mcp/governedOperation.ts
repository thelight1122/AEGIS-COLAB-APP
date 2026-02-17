/**
 * GovernedOperation Schema (Local MCP Phase 1)
 * Enforces an append-only tool execution protocol.
 */

export const OperationStatus = {
    Proposed: "Proposed",
    Requested: "Requested",
    Executed: "Executed",
    Rejected: "Rejected",
    Failed: "Failed"
} as const;
export type OperationStatus = (typeof OperationStatus)[keyof typeof OperationStatus];

export const ToolMode = {
    ReadOnly: "ReadOnly",
    Write: "Write",
    Admin: "Admin"
} as const;
export type ToolMode = (typeof ToolMode)[keyof typeof ToolMode];

export interface ToolProposal {
    toolId: string;
    toolName: string;
    intent: string;
    scope: string[];
    constraints: string[];
    rationale: string;
}

export interface ExecutionRequest {
    requestedAt: number;
    accepted: boolean;
    approvedBy: string[] | "self";
    parameters: Record<string, unknown>;
    acknowledgement?: { peerId: string; at: number }[];
}

export interface OperationResult {
    completedAt: number;
    outcome: "success" | "error";
    data: unknown;
    error?: { code: string; message: string };
    artifacts?: string[];
    appendOnlyHash?: string;
}

export interface GovernedOperation {
    id: string; // OP-uuid
    artifactId: string;
    previousId?: string; // Reference for append-only state updates
    createdAt: number;
    status: OperationStatus;
    mode: ToolMode;
    proposal: ToolProposal;
    request?: ExecutionRequest;
    result?: OperationResult;
    lineage: {
        sessionId?: string;
        peerId?: string;
    };
}

/**
 * Validates a GovernedOperation record structurally.
 */
export function assertGovernedOperation(op: unknown): asserts op is GovernedOperation {
    if (!op || typeof op !== "object") {
        throw new Error("GovernedOperation must be an object");
    }
    const o = op as Record<string, unknown>;
    const required = ["id", "artifactId", "createdAt", "status", "mode", "proposal", "lineage"];
    for (const field of required) {
        if (!o[field]) {
            throw new Error(`Missing required field in GovernedOperation: ${field}`);
        }
    }

    const id = o.id as string;
    if (typeof id !== "string" || !id.startsWith("OP-")) {
        throw new Error(`Invalid operation ID: ${id}. Must start with OP-`);
    }

    const status = o.status as string;
    if (!Object.values(OperationStatus).includes(status as OperationStatus)) {
        throw new Error(`Invalid operation status: ${status}`);
    }

    const mode = o.mode as string;
    if (!Object.values(ToolMode).includes(mode as ToolMode)) {
        throw new Error(`Invalid tool mode: ${mode}`);
    }
}

/**
 * Enforces ReadOnly mode for Phase 1.
 */
export function enforceReadOnly(op: GovernedOperation): void {
    if (op.mode !== ToolMode.ReadOnly) {
        throw new Error(`Phase 1 Error: GovernedOperation mode must be ReadOnly. Found: ${op.mode}`);
    }
}
