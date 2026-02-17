import { describe, it, expect, beforeEach, vi } from "vitest";
import type { GovernedOperation } from "./governedOperation";
import {
    OperationStatus,
    ToolMode
} from "./governedOperation";
import { appendOp } from "./opLedgerStore";
import { executeGovernedReadOnlyTool } from "./governedToolConduit";
import * as fsPromises from "fs/promises";

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

// Properly mock fs/promises for ESM
vi.mock("fs/promises", async () => {
    const memfs = new Map<string, string>();
    memfs.set("src/core/mcp/__fixtures__/hello.txt", "Hello, Governed World!\n");

    return {
        readFile: vi.fn(async (path: string) => {
            const content = memfs.get(path);
            if (content === undefined) {
                const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
                (err as any).code = "ENOENT";
                throw err;
            }
            return Buffer.from(content);
        })
    };
});

describe("GovernedToolConduit", () => {
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

    it("should reject execution if request is not accepted", async () => {
        const opWithUnacceptedRequest: GovernedOperation = {
            ...baseOp,
            status: OperationStatus.Requested,
            request: {
                requestedAt: Date.now(),
                accepted: false,
                approvedBy: "self" as const,
                parameters: {}
            }
        };
        appendOp(opWithUnacceptedRequest);
        await expect(executeGovernedReadOnlyTool("OP-T1", { path: "any.txt" }))
            .rejects.toThrow(/no accepted execution request/);
    });

    it("should reject execution if toolMode is not ReadOnly", async () => {
        const writeOp: GovernedOperation = {
            ...baseOp,
            mode: ToolMode.Write as ToolMode,
            request: {
                requestedAt: Date.now(),
                accepted: true,
                approvedBy: "self" as const,
                parameters: {}
            }
        };
        appendOp(writeOp);
        await expect(executeGovernedReadOnlyTool("OP-T1", { path: "any.txt" }))
            .rejects.toThrow(/mode must be ReadOnly/);
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

    it("should execute and record result if constraints are met", async () => {
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

        const resultOp = await executeGovernedReadOnlyTool("OP-T1", { path: fixturePath });

        expect(resultOp?.status).toBe(OperationStatus.Executed);
        expect(resultOp?.result?.outcome).toBe("success");
        expect(resultOp?.result?.data).toMatchObject({
            path: fixturePath,
            content: "Hello, Governed World!\n"
        });
        expect(resultOp?.result?.appendOnlyHash).toBeDefined();
        expect(fsPromises.readFile).toHaveBeenCalledTimes(1);
    });

    it("should use cached result for subsequent calls with same opId", async () => {
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

        // First execution
        const firstOp = await executeGovernedReadOnlyTool("OP-T1", { path: fixturePath });
        expect(firstOp?.status).toBe(OperationStatus.Executed);
        expect(fsPromises.readFile).toHaveBeenCalledTimes(1);

        // Second execution (should be cached)
        const secondOp = await executeGovernedReadOnlyTool("OP-T1", { path: fixturePath });
        expect(secondOp?.result?.appendOnlyHash).toBe(firstOp?.result?.appendOnlyHash);
        expect(fsPromises.readFile).toHaveBeenCalledTimes(1); // Still 1
    });

    it("should record failure in ledger if file reading fails", async () => {
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

        const nonExistentPath = "src/core/mcp/__fixtures__/missing.txt";

        await expect(executeGovernedReadOnlyTool("OP-T1", { path: nonExistentPath }))
            .rejects.toThrow(/ENOENT/);

        // Check ledger for failure record
        const ledgerRaw = localStorage.getItem("aegis_ops_current-artifact");
        const ops = JSON.parse(ledgerRaw || "[]");
        const latest = ops[ops.length - 1];

        expect(latest.status).toBe(OperationStatus.Failed);
        expect(latest.result.outcome).toBe("error");
        expect(latest.result.error.message).toContain("ENOENT");
    });
});
