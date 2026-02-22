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

export type LensAcknowledgments = Record<string, boolean | string>;

export interface BaseGovernanceEvent {
    timestamp: number;
    timestamp_utc: string; // ISO 8601 with Z
    participant_session_id: string;
    awareness_score_before: number; // 0-100
    awareness_score_after: number; // 0-100
    lens_acknowledgments?: LensAcknowledgments;
}

export type GovernanceEvent =
    | ({ type: "AWARENESS_ACK"; peerId: string } & BaseGovernanceEvent)
    | ({ type: "CONTRIBUTION"; peerId: string; lensId?: string } & BaseGovernanceEvent)
    | ({ type: "PROXY_REVIEW"; lensId: string } & BaseGovernanceEvent)
    | ({ type: "DEFER_LENS"; lensId: string; rationale: string } & BaseGovernanceEvent)
    | ({ type: "lens_deferral_with_rationale"; lensId: string; rationale: string } & BaseGovernanceEvent)
    | ({ type: "LOCK_REQUEST" } & BaseGovernanceEvent)
    | ({ type: "AI_CHAT_REQUESTED"; peerId: string; provider: string; model: string; prompt: string } & BaseGovernanceEvent)
    | ({ type: "AI_CHAT_COMPLETED"; peerId: string; responseText: string } & BaseGovernanceEvent)
    | ({ type: "AI_CHAT_FAILED"; peerId: string; error: string } & BaseGovernanceEvent);

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
