// src/core/governance/inclusionState.ts

import type {
    Artifact,
    GovernanceEvent,
    InclusionState,
    Lens,
    Peer,
    PeerConsiderationLedger,
} from "./types";

const uniq = (arr: string[]) => Array.from(new Set(arr));
const intersectNonEmpty = (a: string[], b: string[]) => a.some((x) => b.includes(x));

export function computeInclusionState(
    artifact: Artifact,
    peers: Peer[],
    lenses: Lens[],
    events: GovernanceEvent[]
): InclusionState {
    const domainTags = Array.isArray(artifact.domainTags) ? artifact.domainTags : [];

    const intersectingPeers = peers
        .filter((p) => intersectNonEmpty(p.declaredDomains ?? [], domainTags))
        .map((p) => p.id);

    const intersectingLenses = lenses
        .filter((l) => intersectNonEmpty(l.domains ?? [], domainTags))
        .map((l) => l.id);

    const ackEvents = events.filter((e) => e.type === "AWARENESS_ACK") as Extract<
        GovernanceEvent,
        { type: "AWARENESS_ACK" }
    >[];

    const acknowledgedPeers = uniq(
        ackEvents.map((e) => e.peerId).filter((id) => intersectingPeers.includes(id))
    );

    const awarenessPercent =
        intersectingPeers.length === 0 ? 1 : acknowledgedPeers.length / intersectingPeers.length;

    const awarenessSatisfied = awarenessPercent === 1;

    // Represented lenses: by contributions with lensId OR proxy reviews
    const contributionEvents = events.filter((e) => e.type === "CONTRIBUTION") as Extract<
        GovernanceEvent,
        { type: "CONTRIBUTION" }
    >[];

    const proxyEvents = events.filter((e) => e.type === "PROXY_REVIEW") as Extract<
        GovernanceEvent,
        { type: "PROXY_REVIEW" }
    >[];

    const representedByContribution = contributionEvents
        .map((e) => e.lensId)
        .filter((x): x is string => typeof x === "string" && x.length > 0);

    const representedByProxy = proxyEvents.map((e) => e.lensId);

    const representedLenses = uniq(
        [...representedByContribution, ...representedByProxy].filter((id) =>
            intersectingLenses.includes(id)
        )
    );

    // Deferred lenses require non-empty rationale
    const deferEvents = events.filter((e) => e.type === "DEFER_LENS") as Extract<
        GovernanceEvent,
        { type: "DEFER_LENS" }
    >[];

    const deferredLenses = uniq(
        deferEvents
            .filter((e) => typeof e.rationale === "string" && e.rationale.trim().length > 0)
            .map((e) => e.lensId)
            .filter((id) => intersectingLenses.includes(id))
    ).map((lensId) => {
        // Use the latest rationale for determinism
        const latest = [...deferEvents]
            .filter((e) => e.lensId === lensId && e.rationale.trim().length > 0)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
        return { lensId, rationale: latest?.rationale.trim() ?? "" };
    });

    const deferredLensIds = deferredLenses.map((d) => d.lensId);

    const missingLenses = intersectingLenses.filter(
        (id) => !representedLenses.includes(id) && !deferredLensIds.includes(id)
    );

    const lockAvailable = awarenessSatisfied && missingLenses.length === 0;

    const reasons: string[] = [];
    if (!awarenessSatisfied) {
        reasons.push("Not all intersecting peers have acknowledged awareness.");
    }
    if (missingLenses.length > 0) {
        reasons.push(
            `The following lenses are unrepresented and not deferred: ${missingLenses.join(", ")}`
        );
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
    };
}
