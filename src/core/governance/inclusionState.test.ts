import { describe, it, expect } from "vitest";
import { computeInclusionState } from "./inclusionState";
import type { Artifact, GovernanceEvent, Lens, Peer } from "./types";

const baseArtifact: Artifact = {
    id: "A1",
    status: "Active",
    domainTags: ["Operational Layer", "Canon Integrity", "Drift Detection"],
};

const peers: Peer[] = [
    { id: "Tracey", type: "human", declaredDomains: ["Operational Layer"], lensIds: [] },
    { id: "Auditor-1", type: "human", declaredDomains: ["Canon Integrity"], lensIds: [] },
];

const lenses: Lens[] = [
    { id: "CanonGuardian", domains: ["Canon Integrity", "Operational Layer"], autoReview: true },
    { id: "DriftSentinel", domains: ["Drift Detection", "Operational Layer"], autoReview: false },
];

describe("computeInclusionState", () => {
    it("computes intersections", () => {
        const state = computeInclusionState(baseArtifact, peers, lenses, []);
        expect(state.intersectingPeers.sort()).toEqual(["Auditor-1", "Tracey"].sort());
        expect(state.intersectingLenses.sort()).toEqual(["CanonGuardian", "DriftSentinel"].sort());
    });

    it("awareness satisfied when all intersecting peers acknowledged", () => {
        const events: GovernanceEvent[] = [
            { type: "AWARENESS_ACK", peerId: "Tracey", timestamp: 1 },
            { type: "AWARENESS_ACK", peerId: "Auditor-1", timestamp: 2 },
        ];
        const state = computeInclusionState(baseArtifact, peers, lenses, events);
        expect(state.awarenessSatisfied).toBe(true);
        expect(state.awarenessPercent).toBe(1);
    });

    it("lock unavailable with missing lenses", () => {
        const events: GovernanceEvent[] = [
            { type: "AWARENESS_ACK", peerId: "Tracey", timestamp: 1 },
            { type: "AWARENESS_ACK", peerId: "Auditor-1", timestamp: 2 },
            { type: "PROXY_REVIEW", lensId: "CanonGuardian", timestamp: 3 },
        ];
        const state = computeInclusionState(baseArtifact, peers, lenses, events);
        expect(state.missingLenses).toContain("DriftSentinel");
        expect(state.lockAvailable).toBe(false);
    });

    it("deferral requires non-empty rationale", () => {
        const events: GovernanceEvent[] = [
            { type: "AWARENESS_ACK", peerId: "Tracey", timestamp: 1 },
            { type: "AWARENESS_ACK", peerId: "Auditor-1", timestamp: 2 },
            { type: "PROXY_REVIEW", lensId: "CanonGuardian", timestamp: 3 },
            { type: "DEFER_LENS", lensId: "DriftSentinel", rationale: " ", timestamp: 4 },
        ];
        const state = computeInclusionState(baseArtifact, peers, lenses, events);
        expect(state.deferredLenses.find((d) => d.lensId === "DriftSentinel")).toBeUndefined();
        expect(state.lockAvailable).toBe(false);
    });

    it("lock available when missing lenses represented or deferred with rationale", () => {
        const events: GovernanceEvent[] = [
            { type: "AWARENESS_ACK", peerId: "Tracey", timestamp: 1 },
            { type: "AWARENESS_ACK", peerId: "Auditor-1", timestamp: 2 },
            { type: "PROXY_REVIEW", lensId: "CanonGuardian", timestamp: 3 },
            { type: "DEFER_LENS", lensId: "DriftSentinel", rationale: "Deferred for later review", timestamp: 4 },
        ];
        const state = computeInclusionState(baseArtifact, peers, lenses, events);
        expect(state.missingLenses.length).toBe(0);
        expect(state.lockAvailable).toBe(true);
    });
});
