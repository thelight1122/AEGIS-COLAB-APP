import { describe, it, expect } from "vitest";
import { computeInclusionState } from "./inclusionState";
import type { Artifact, GovernanceEvent, Lens, Peer } from "./types";

const baseArtifact: Artifact = {
    id: "A1",
    status: "Active",
    domainTags: ["Operational Layer", "Canon Integrity", "Drift Detection"],
};

const peers: Peer[] = [
    { id: "Tracey", type: "human", domains: ["Operational Layer"] },
    { id: "Auditor-1", type: "human", domains: ["Canon Integrity"] },
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

    describe("BMs Directive: Weighted Intersection & Shadow Sentinel", () => {
        it("identifies missing primary intersects", () => {
            const artifact: Artifact = { ...baseArtifact, domainTags: ["A", "B"] };
            const testPeers: Peer[] = [
                { id: "Expert-A", type: "human", domains: ["A"] },
                { id: "Expert-AB", type: "human", domains: ["A", "B"] },
            ];
            const state = computeInclusionState(artifact, testPeers, [], []);
            expect(state.reasons.some(r => r.includes("Primary domain experts missing acknowledgement: Expert-AB"))).toBe(true);
            expect(state.reasons.some(r => r.includes("Partial domain intersects missing acknowledgement"))).toBe(true);
        });

        it("blocks lock if shadow affects (survival language) are detected", () => {
            const events: GovernanceEvent[] = [
                { type: "DEFER_LENS", lensId: "Lens1", rationale: "I need this to pass or I will lose my funding", timestamp: 1 }
            ];
            const artifact: Artifact = { ...baseArtifact, domainTags: ["Lens1"] };
            const state = computeInclusionState(artifact, [], [], events);
            expect(state.detectedShadowAffects.length).toBeGreaterThan(0);
            expect(state.lockAvailable).toBe(false);
            expect(state.reasons.some(r => r.includes("Shadow Affects detected"))).toBe(true);
        });

        it("requires system lenses for high-impact artifacts", () => {
            const highImpactArtifact: Artifact = { ...baseArtifact, isHighImpact: true };
            const events: GovernanceEvent[] = [
                { type: "AWARENESS_ACK", peerId: "Tracey", timestamp: 1 },
                { type: "AWARENESS_ACK", peerId: "Auditor-1", timestamp: 2 },
                { type: "PROXY_REVIEW", lensId: "CanonGuardian", timestamp: 3 },
                { type: "PROXY_REVIEW", lensId: "DriftSentinel", timestamp: 4 },
                { type: "PROXY_REVIEW", lensId: "Rational Synthesis", timestamp: 5 },
                // Missing Affective Synthesis
            ];
            const state = computeInclusionState(highImpactArtifact, peers, lenses, events);
            expect(state.lockAvailable).toBe(false);
            expect(state.reasons.some(r => r.includes("High-Impact artifact requires: Affective Synthesis"))).toBe(true);
        });
    });
});
