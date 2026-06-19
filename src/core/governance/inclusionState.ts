// src/core/governance/inclusionState.ts

import type {
    Artifact,
    GovernanceEvent,
    InclusionState,
    Lens,
    Peer,
    PeerConsiderationLedger,
} from "./types";

import { detectShadowAffects } from "./shadowSentinel";
import { RATIONAL_SYNTHESIS_LENS, AFFECTIVE_SYNTHESIS_LENS } from "./systemLenses";

const uniq = (arr: string[]) => Array.from(new Set(arr.map(s => s.trim())));
const intersect = (a: string[], b: string[]) => {
    const bSet = new Set(b.map(s => s.toLowerCase().trim()));
    return a.filter(x => bSet.has(x.toLowerCase().trim()));
};
const intersectNonEmpty = (a: string[], b: string[]) => {
    const bSet = new Set(b.map(s => s.toLowerCase().trim()));
    return a.some(x => bSet.has(x.toLowerCase().trim()));
};

export function computeInclusionState(
    artifact: Artifact,
    peers: Peer[],
    lenses: Lens[],
    events: GovernanceEvent[]
): InclusionState {
    const domainTags = Array.isArray(artifact.domainTags) ? artifact.domainTags : [];

    // 1. Calculate Weighted Intersection Depth for Peers
    const enrichedPeers = peers.map(p => {
        const overlap = intersect(p.domains || [], domainTags);
        const depth = domainTags.length > 0 ? overlap.length / domainTags.length : 0;
        return { ...p, intersectionDepth: depth };
    });

    const intersectingPeers = enrichedPeers
        .filter((p) => p.intersectionDepth > 0)
        .map((p) => p.id.trim());

    const intersectingLenses = uniq(lenses
        .filter((l: Lens) => intersectNonEmpty(l.domains || [], domainTags))
        .map((l) => l.id.trim()));

    const ackEvents = events.filter((e) => e.type === "AWARENESS_ACK") as Extract<
        GovernanceEvent,
        { type: "AWARENESS_ACK" }
    >[];

    const acknowledgedPeers = uniq([
        ...peers.filter((p: Peer) => (p as Peer & { acknowledged?: boolean }).acknowledged).map((p) => p.id.trim()),
        ...ackEvents.map((e) => e.peerId.trim()),
    ].filter((id) => intersectingPeers.includes(id)));

    const awarenessPercent =
        intersectingPeers.length === 0 ? 1 : acknowledgedPeers.length / intersectingPeers.length;

    const awarenessSatisfied = awarenessPercent >= 0.999;

    // 2. Synthesis & Coverage
    const contributionEvents = events.filter((e) => e.type === "CONTRIBUTION") as Extract<
        GovernanceEvent,
        { type: "CONTRIBUTION" }
    >[];

    const proxyEvents = events.filter((e) => e.type === "PROXY_REVIEW") as Extract<
        GovernanceEvent,
        { type: "PROXY_REVIEW" }
    >[];

    const representedByContribution = contributionEvents
        .map((e) => e.lensId?.trim())
        .filter((x): x is string => typeof x === "string" && x.length > 0);

    const representedByProxy = proxyEvents.map((e) => e.lensId.trim());

    const representedLenses = uniq(
        [...representedByContribution, ...representedByProxy].filter((id) =>
            intersectingLenses.includes(id) || id === RATIONAL_SYNTHESIS_LENS || id === AFFECTIVE_SYNTHESIS_LENS
        )
    );

    // 3. Shadow Affect Detection
    const detectedShadowAffects = detectShadowAffects(events);

    // 4. Convergence Requirements (System Lenses)
    const isHighImpact = artifact.isHighImpact || artifact.hasTension;
    const hasRational = representedLenses.includes(RATIONAL_SYNTHESIS_LENS);
    const hasAffective = representedLenses.includes(AFFECTIVE_SYNTHESIS_LENS);
    const synthesisSatisfied = !isHighImpact || (hasRational && hasAffective);

    const deferEvents = events.filter((e) => e.type === "DEFER_LENS" || e.type === "lens_deferral_with_rationale") as (Extract<
        GovernanceEvent,
        { type: "DEFER_LENS" }
    > | Extract<GovernanceEvent, { type: "lens_deferral_with_rationale" }>)[];

    const deferredLenses = uniq(
        deferEvents
            .filter((e) => typeof e.rationale === "string" && e.rationale.trim().length > 0)
            .map((e) => e.lensId.trim())
            .filter((id) => intersectingLenses.includes(id))
    ).map((lensId) => {
        const latest = [...deferEvents]
            .filter((e) => e.lensId.trim() === lensId && e.rationale.trim().length > 0)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
        return { lensId, rationale: latest?.rationale.trim() ?? "" };
    });

    const deferredLensIds = deferredLenses.map((d) => d.lensId);

    const missingLenses = intersectingLenses.filter(
        (id) => !representedLenses.includes(id) && !deferredLensIds.includes(id)
    );

    const lockAvailable = awarenessSatisfied && missingLenses.length === 0 && synthesisSatisfied && detectedShadowAffects.length === 0;

    const reasons: string[] = [];

    // Prioritize missing primary intersects (depth = 1)
    const unacknowledgedPeers = enrichedPeers.filter(p => p.intersectionDepth > 0 && !acknowledgedPeers.includes(p.id));
    const primariesMissing = unacknowledgedPeers.filter(p => p.intersectionDepth === 1);
    const partialsMissing = unacknowledgedPeers.filter(p => p.intersectionDepth < 1);

    if (primariesMissing.length > 0) {
        reasons.push(`Primary domain experts missing acknowledgement: ${primariesMissing.map(p => (p as Peer & { name?: string }).name || p.id).join(", ")}`);
    }
    if (partialsMissing.length > 0 && !awarenessSatisfied) {
        reasons.push(`Partial domain intersects missing acknowledgement: ${partialsMissing.length}`);
    }

    if (missingLenses.length > 0) {
        reasons.push(
            `Missing lenses: ${missingLenses.join(", ")}`
        );
    }

    if (isHighImpact && !synthesisSatisfied) {
        const missing = [];
        if (!hasRational) missing.push(RATIONAL_SYNTHESIS_LENS);
        if (!hasAffective) missing.push(AFFECTIVE_SYNTHESIS_LENS);
        reasons.push(`High-Impact artifact requires: ${missing.join(" & ")}`);
    }

    if (detectedShadowAffects.length > 0) {
        reasons.push(`Shadow Affects detected! Revision required: ${detectedShadowAffects.join("; ")}`);
    }

    return {
        intersectingPeers,
        intersectingLenses,
        acknowledgedPeers,
        awarenessPercent,
        representedLenses,
        deferredLenses,
        missingLenses,
        awarenessSatisfied,
        lockAvailable,
        reasons,
        detectedShadowAffects
    };
}

export function canLock(
    artifact: Artifact,
    peers: Peer[],
    lenses: Lens[],
    events: GovernanceEvent[]
): { ok: boolean; state: InclusionState } {
    const state = computeInclusionState(artifact, peers, lenses, events);
    return { ok: state.lockAvailable, state };
}

export function buildLedgerSnapshot(
    artifactId: string,
    inclusionState: InclusionState,
    timestamp: number
): PeerConsiderationLedger {
    return {
        artifactId,
        notifiedPeers: inclusionState.intersectingPeers,
        acknowledgedPeers: inclusionState.acknowledgedPeers,
        representedLenses: inclusionState.representedLenses,
        deferredLenses: inclusionState.deferredLenses,
        missingLenses: [],
        timestamp,
        awarenessPercent: inclusionState.awarenessPercent,
        detectedShadowAffects: inclusionState.detectedShadowAffects
    };
}
