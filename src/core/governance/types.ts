// src/core/governance/types.ts

export type ArtifactStatus = "Draft" | "Active" | "Ready" | "Locked" | "Superseded";

export type Artifact = {
    id: string;
    domainTags: string[];
    status: ArtifactStatus;
    isHighImpact?: boolean;
    hasTension?: boolean;
};

export type PeerType = "human" | "ai";

export type Peer = {
    id: string;
    type: PeerType;
    domains: string[];
    intersectionDepth?: number; // 0..1
};

export type Lens = {
    id: string;
    domains: string[];
    autoReview: boolean;
};

export type GovernanceEvent =
    | { type: "AWARENESS_ACK"; peerId: string; timestamp: number }
    | { type: "CONTRIBUTION"; peerId: string; lensId?: string; timestamp: number }
    | { type: "PROXY_REVIEW"; lensId: string; timestamp: number }
    | { type: "DEFER_LENS"; lensId: string; rationale: string; timestamp: number }
    | { type: "LOCK_REQUEST"; timestamp: number };

export type DeferredLens = { lensId: string; rationale: string };

export type InclusionState = {
    intersectingPeers: string[];
    intersectingLenses: string[];
    acknowledgedPeers: string[];
    awarenessPercent: number; // 0..1
    representedLenses: string[];
    deferredLenses: DeferredLens[];
    missingLenses: string[];
    awarenessSatisfied: boolean;
    lockAvailable: boolean;
    reasons: string[];
    detectedShadowAffects: string[];
};

export type PeerConsiderationLedger = {
    artifactId: string;
    notifiedPeers: string[];
    acknowledgedPeers: string[];
    representedLenses: string[];
    deferredLenses: DeferredLens[];
    missingLenses: string[]; // must be []
    timestamp: number;
    awarenessPercent: number;
    detectedShadowAffects: string[];
};
