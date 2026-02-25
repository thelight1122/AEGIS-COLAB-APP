import type { InclusionState } from "./types";

/**
 * Derives a coherence percentage from the current governance state.
 * 
 * risk = boundaryConflicts + driftMarkers + coherenceRisks
 * total = max(total, 1)
 * coherence = clamp( round(100 * (1 - risk/total)), 0, 100 )
 */
export function calculateCoherence(inclusion: InclusionState): number {
    // boundaryConflicts: Missing lenses that should be there
    const boundaryConflicts = inclusion.missingLenses.length;

    // driftMarkers: Detected shadow affects / tone violations
    const driftMarkers = inclusion.detectedShadowAffects.length;

    // coherenceRisks: Unacknowledged peers who are in the domain intersection
    const coherenceRisks = inclusion.intersectingPeers.length - inclusion.acknowledgedPeers.length;

    const risk = boundaryConflicts + driftMarkers + coherenceRisks;

    // total: The sum of all elements that SHOULD be coherent
    const total = inclusion.intersectingLenses.length + inclusion.intersectingPeers.length;

    if (total === 0) return 100; // Perfect coherence if no requirements exist

    const score = Math.round(100 * (1 - risk / total));

    return Math.min(100, Math.max(0, score));
}
