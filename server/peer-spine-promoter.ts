/**
 * peer-spine-promoter.ts — PEER → SPINE Promotion Engine
 *
 * Source: AEGIS Canon Addendum — SPINE v1.0-SP
 *         Recurrence and Decay Rules (PEER → Spine) — v1 Research Spec
 *
 * This engine sits between PEER and SPINE. It is the only path by which
 * pattern evidence accumulates into long-term structural memory.
 *
 * What it does:
 *   1. Receives a new PEER entry
 *   2. Applies decay to existing entries (freshness weights)
 *   3. Runs similarity scoring against known patterns
 *   4. Checks anti-overfitting guards (rate limiting, context diversity)
 *   5. Checks Candidate threshold (X≥3, Y≥2, Z≤30d) → IDS reflection signal
 *   6. Checks Promotion threshold (X≥7, Y≥3, Z≤90d) → SPINE entry
 *   7. Manages pattern lifecycle (Active → Dormant → Archived)
 *
 * Similarity scoring (no embeddings needed on day one):
 *   +0.45  exact match on observed_noise_type
 *   +0.35  match on signal_discrepancy category
 *   +0.20  match on interaction_context group
 *   S ≥ 0.75 → treated as "same pattern"
 *
 * Pattern lifecycle:
 *   Active   → evidence mass M ≥ 1.5 or recent activity within 30d
 *   Dormant  → M < 1.5 AND no new hits in 30d
 *   Archived → Dormant for 90d (can reactivate if pattern reappears)
 *
 * Anti-overfitting guards (non-negotiable):
 *   - No single entry can trigger promotion
 *   - Context diversity (Y ≥ 3) is mandatory for promotion
 *   - Rate limit: max 2 weighted votes per 24h per pattern
 */

import {
    getAllPeerEntries,
    getEntriesBySignature,
    applyDecayToAll,
    computeDecayWeight,
    type PeerEntry,
    type NoiseType,
    type SignalDiscrepancy,
    type InteractionContext,
} from './peer.js';
import {
    promoteToSpine,
    hasSpineEntry,
    type SpineEntry,
} from './spine.js';
import type { IEVEffectName } from '../src/core/canon/aegis-iev.js';

// ── Thresholds (Canon-locked) ─────────────────────────────────────────────────
// Source: SPINE v1.0-SP §X, Recurrence and Decay Rules v1

export const CANDIDATE_X = 3;   // occurrences required for IDS reflection
export const CANDIDATE_Y = 2;   // distinct contexts required for Candidate
export const CANDIDATE_Z_DAYS = 30;  // rolling window (days)

export const PROMOTION_X = 7;   // occurrences required for SPINE promotion
export const PROMOTION_Y = 3;   // distinct contexts required for Promotion
export const PROMOTION_Z_DAYS = 90;  // rolling window (days)

export const CANDIDATE_Z_MS = CANDIDATE_Z_DAYS * 24 * 60 * 60 * 1000;
export const PROMOTION_Z_MS = PROMOTION_Z_DAYS * 24 * 60 * 60 * 1000;

/** Pattern-level dormancy: M < threshold AND 30d no new hits */
export const DORMANT_MASS_THRESHOLD = 1.5;
export const DORMANT_WINDOW_DAYS = 30;
export const DORMANT_WINDOW_MS = DORMANT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const ARCHIVED_WINDOW_DAYS = 90;
export const ARCHIVED_WINDOW_MS = ARCHIVED_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Rate limiting: max 2 weighted votes per 24h per pattern */
export const RATE_LIMIT_PER_24H = 2;
export const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// ── Similarity Scoring ────────────────────────────────────────────────────────
// Source: Recurrence and Decay Rules v1 §1.2

/**
 * Compute similarity score S ∈ [0, 1] between two PEER entries.
 *
 *   +0.45  exact match on observed_noise_type
 *   +0.35  match on signal_discrepancy
 *   +0.20  match on interaction_context
 *
 * S ≥ 0.75 → treated as the same pattern (fuzzy matching without embeddings)
 */
export function computeSimilarity(a: PeerEntry, b: PeerEntry): number {
    let score = 0;
    if (a.observed_noise_type === b.observed_noise_type) score += 0.45;
    if (a.signal_discrepancy   === b.signal_discrepancy)  score += 0.35;
    if (a.interaction_context  === b.interaction_context)  score += 0.20;
    return score;
}

/** Minimum similarity threshold for "same pattern" classification */
export const SIMILARITY_THRESHOLD = 0.75;

// ── Pattern Cluster ───────────────────────────────────────────────────────────

export type PatternStatus = 'active' | 'dormant' | 'archived';

export interface PatternCluster {
    /** The canonical signature of this pattern cluster */
    signature: string;
    /** All PEER entries in this cluster (by event_id) */
    member_event_ids: string[];
    /** Lifecycle status */
    status: PatternStatus;
    /** Unix ms of most recent entry addition */
    last_hit_at: number;
    /** Unix ms when status became 'dormant' (undefined if never dormant) */
    dormant_since?: number;
    /** Whether this cluster has already been promoted to SPINE */
    promoted: boolean;
    /**
     * Vote timestamps per 24h window for rate limiting.
     * Only the most recent RATE_LIMIT_PER_24H votes within the window count.
     */
    recent_vote_timestamps: number[];
}

// ── Pattern Store ─────────────────────────────────────────────────────────────
// In-memory. Indexed by recurrence_signature.

const _patterns = new Map<string, PatternCluster>();

// ── Rate Limiting ─────────────────────────────────────────────────────────────

/**
 * Check if a new vote is permitted for a cluster under the rate limit.
 * Returns true if the vote may be counted; false if the limit has been reached.
 * Cleans expired timestamps from the cluster's recent_vote_timestamps.
 */
function isVotePermitted(cluster: PatternCluster, now: number): boolean {
    // Purge timestamps older than 24h
    cluster.recent_vote_timestamps = cluster.recent_vote_timestamps.filter(
        t => now - t < RATE_LIMIT_WINDOW_MS,
    );
    return cluster.recent_vote_timestamps.length < RATE_LIMIT_PER_24H;
}

// ── Pattern Lifecycle ─────────────────────────────────────────────────────────

/**
 * Compute the evidence mass M = Σ(w_i) for all entries in a cluster
 * within a given time window.
 */
export function computeClusterMass(
    cluster: PatternCluster,
    windowMs: number,
    now: number = Date.now(),
): number {
    const entries = getAllPeerEntries().filter(e =>
        cluster.member_event_ids.includes(e.event_id) &&
        now - e.timestamp <= windowMs,
    );
    return entries.reduce((sum, e) => sum + computeDecayWeight(e, now), 0);
}

/**
 * Update pattern lifecycle status based on current evidence mass and activity.
 * Active → Dormant → Archived (can wake from Archived if new evidence arrives)
 */
function updatePatternLifecycle(cluster: PatternCluster, now: number): void {
    if (cluster.promoted) return; // Promoted clusters are no longer managed here

    const mass = computeClusterMass(cluster, PROMOTION_Z_MS, now);
    const daysSinceHit = (now - cluster.last_hit_at) / (24 * 60 * 60 * 1000);

    if (cluster.status === 'active') {
        if (mass < DORMANT_MASS_THRESHOLD && daysSinceHit > DORMANT_WINDOW_DAYS) {
            cluster.status = 'dormant';
            cluster.dormant_since = now;
        }
    } else if (cluster.status === 'dormant') {
        if (cluster.dormant_since !== undefined) {
            const dormantDays = (now - cluster.dormant_since) / (24 * 60 * 60 * 1000);
            if (dormantDays > ARCHIVED_WINDOW_DAYS) {
                cluster.status = 'archived';
            }
        }
    }
    // Archived clusters with new hits wake back to active (handled in checkEntry)
}

// ── Core: Find Matching Cluster ───────────────────────────────────────────────

/**
 * Find an existing cluster that matches a new PEER entry with S ≥ 0.75.
 * Returns the best-matching cluster, or undefined if none found.
 */
function findMatchingCluster(entry: PeerEntry): PatternCluster | undefined {
    let bestCluster: PatternCluster | undefined;
    let bestScore = 0;

    for (const [, cluster] of _patterns) {
        if (cluster.promoted) continue;

        // Get a representative entry from this cluster for scoring
        const members = getAllPeerEntries().filter(e =>
            cluster.member_event_ids.includes(e.event_id),
        );
        if (members.length === 0) continue;

        const representative = members[members.length - 1]!;
        const score = computeSimilarity(entry, representative);

        if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
            bestScore = score;
            bestCluster = cluster;
        }
    }

    return bestCluster;
}

// ── Threshold Checks ──────────────────────────────────────────────────────────

/**
 * Count distinct interaction contexts in a cluster within the given window.
 */
function countDistinctContexts(
    cluster: PatternCluster,
    windowMs: number,
    now: number = Date.now(),
): number {
    const entries = getAllPeerEntries().filter(e =>
        cluster.member_event_ids.includes(e.event_id) &&
        now - e.timestamp <= windowMs,
    );
    return new Set(entries.map(e => e.interaction_context)).size;
}

/**
 * Count occurrences (weighted) in a cluster within the given window.
 * Counts each entry as 1 occurrence (not weighted for threshold counting —
 * weight is used for mass computation, not occurrence counting).
 */
function countOccurrences(
    cluster: PatternCluster,
    windowMs: number,
    now: number = Date.now(),
): number {
    return getAllPeerEntries().filter(e =>
        cluster.member_event_ids.includes(e.event_id) &&
        now - e.timestamp <= windowMs,
    ).length;
}

// ── IEV Effect Mapping ────────────────────────────────────────────────────────

/**
 * Map a noise type to the most appropriate IEV interpretive effects.
 * SPINE is the sole origin of IEV effects — this mapping formalizes that.
 * Maximum 3 effects per SPINE entry (Canon composition rule).
 */
function mapNoiseToIEV(
    noise_type: NoiseType,
    discrepancy: SignalDiscrepancy,
): IEVEffectName[] {
    const effects: IEVEffectName[] = [];

    // Primary noise-type mapping
    switch (noise_type) {
        case 'symbolic_compression':
            effects.push('IncreaseSymbolicTolerance');
            effects.push('ExpandContextualFrame');
            break;
        case 'affect_logic_mismatch':
            effects.push('DelayClosure');
            effects.push('DeferEvaluation');
            break;
        case 'ambiguity_amplification':
            effects.push('DelayClosure');
            effects.push('PreferClarificationOverAssumption');
            break;
        case 'interpretive_resistance':
            effects.push('ExpandContextualFrame');
            effects.push('TemperConfidence');
            break;
        case 'guardrail_friction':
            effects.push('IncreaseSymbolicTolerance');
            effects.push('PreferClarificationOverAssumption');
            break;
        case 'unresolved_contradiction':
            effects.push('DelayClosure');
            effects.push('HighlightStructuralPattern');
            break;
        case 'contextual_drift':
            effects.push('ExpandContextualFrame');
            effects.push('HighlightStructuralPattern');
            break;
        default:
            effects.push('TemperConfidence');
    }

    // Secondary discrepancy enhancement (add if not already present, respect max 3)
    if (effects.length < 3) {
        if (discrepancy === 'affect_vs_structure' && !effects.includes('DelayClosure')) {
            effects.push('DelayClosure');
        } else if (discrepancy === 'intent_vs_expression' && !effects.includes('PreferClarificationOverAssumption')) {
            effects.push('PreferClarificationOverAssumption');
        }
    }

    return effects.slice(0, 3); // Cap at 3 per IEV composition rule
}

// ── Abstracted Pattern Generation ─────────────────────────────────────────────

/**
 * Generate a structural abstracted_pattern string from cluster evidence.
 * This is epistemic prose — no actors, no blame, no urgency.
 * The pattern describes structure, not story.
 */
function generateAbstractedPattern(
    noise_type: NoiseType,
    discrepancy: SignalDiscrepancy,
    contextCount: number,
    occurrenceCount: number,
): string {
    const noiseDesc: Record<NoiseType, string> = {
        symbolic_compression:       'symbolic language tends to compress under constrained interpretation',
        affect_logic_mismatch:      'affective charge correlates with interpretive compression even when logical structure is intact',
        ambiguity_amplification:    'ambiguity density increases under conditions of certainty pressure',
        interpretive_resistance:    'interpretive closure is reached prematurely when contextual framing is insufficient',
        guardrail_friction:         'repeated boundary friction signals a mismatch between intent expression and interpretive lens',
        unresolved_contradiction:   'structural contradictions persist across exchanges without natural resolution',
        contextual_drift:           'contextual coherence degrades as interaction frame shifts',
        hesitation_loop:            'response formation enters repeated hesitation under unresolved ambiguity',
        none:                       'no recurring instability pattern detected',
    };

    const discrepancyDesc: Record<SignalDiscrepancy, string> = {
        intent_vs_expression:    ', with divergence between intent and expression observed',
        meaning_vs_interpretation: ', with divergence between meaning and interpretation observed',
        clarity_vs_constraint:   ', with divergence between clarity and constraint observed',
        affect_vs_structure:     ', with divergence between affective signal and structural logic observed',
        none:                    '',
    };

    const base = noiseDesc[noise_type];
    const disc = discrepancyDesc[discrepancy];
    const breadth = `Observed across ${contextCount} distinct context${contextCount !== 1 ? 's' : ''} (${occurrenceCount} occurrences).`;

    return `Recurring pattern: ${base}${disc}. ${breadth}`;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export interface PromoterResult {
    /** The PEER entry that was evaluated */
    peer_entry: PeerEntry;
    /** Whether a Candidate threshold was crossed (→ IDS reflection signal) */
    candidate_threshold_crossed: boolean;
    /** Whether a Promotion threshold was crossed (→ new SPINE entry) */
    promotion_threshold_crossed: boolean;
    /** The SPINE entry if promotion occurred */
    spine_entry?: SpineEntry;
    /** Whether the vote was rate-limited (did not count) */
    rate_limited: boolean;
    /** The pattern cluster this entry was assigned to */
    cluster_signature: string;
    /** Pattern cluster status after processing */
    cluster_status: PatternStatus;
    /** Occurrence count within the promotion window */
    occurrence_count: number;
    /** Distinct context count within the promotion window */
    context_count: number;
}

/**
 * Process a new PEER entry through the recurrence and promotion engine.
 *
 * This is the canonical PEER → SPINE promotion path.
 * Called by the pipeline after each PEER entry is recorded.
 *
 * @param entry  The freshly recorded PEER entry
 * @param now    Current time (injectable for testing)
 * @returns      PromoterResult describing what happened
 */
export function checkEntry(
    entry: PeerEntry,
    now: number = Date.now(),
): PromoterResult {
    // Apply decay to all entries before pattern mass computation
    applyDecayToAll(now);

    // Skip 'none' entries — no signal, no pattern
    if (entry.observed_noise_type === 'none') {
        return {
            peer_entry: entry,
            candidate_threshold_crossed: false,
            promotion_threshold_crossed: false,
            rate_limited: false,
            cluster_signature: entry.recurrence_signature,
            cluster_status: 'active',
            occurrence_count: 0,
            context_count: 0,
        };
    }

    // Find or create the matching cluster
    let cluster = findMatchingCluster(entry);

    if (!cluster) {
        // New pattern — create a cluster
        cluster = {
            signature: entry.recurrence_signature,
            member_event_ids: [],
            status: 'active',
            last_hit_at: now,
            promoted: false,
            recent_vote_timestamps: [],
        };
        _patterns.set(entry.recurrence_signature, cluster);
    }

    // Wake archived/dormant cluster if new evidence arrives
    if (cluster.status === 'dormant' || cluster.status === 'archived') {
        cluster.status = 'active';
        cluster.dormant_since = undefined;
    }

    // Rate limiting — max 2 votes per 24h per pattern
    const votePassed = isVotePermitted(cluster, now);
    if (!votePassed) {
        return {
            peer_entry: entry,
            candidate_threshold_crossed: false,
            promotion_threshold_crossed: false,
            rate_limited: true,
            cluster_signature: cluster.signature,
            cluster_status: cluster.status,
            occurrence_count: countOccurrences(cluster, PROMOTION_Z_MS, now),
            context_count: countDistinctContexts(cluster, PROMOTION_Z_MS, now),
        };
    }

    // Vote accepted — add to cluster
    cluster.member_event_ids.push(entry.event_id);
    cluster.last_hit_at = now;
    cluster.recent_vote_timestamps.push(now);

    // Update lifecycle status
    updatePatternLifecycle(cluster, now);

    // Count occurrences and contexts within Candidate window
    const candidateOccurrences = countOccurrences(cluster, CANDIDATE_Z_MS, now);
    const candidateContexts    = countDistinctContexts(cluster, CANDIDATE_Z_MS, now);

    // Count occurrences and contexts within Promotion window
    const promotionOccurrences = countOccurrences(cluster, PROMOTION_Z_MS, now);
    const promotionContexts    = countDistinctContexts(cluster, PROMOTION_Z_MS, now);

    let candidateCrossed = false;
    let promotionCrossed = false;
    let spine_entry: SpineEntry | undefined;

    // Check Promotion threshold first (superset of Candidate)
    if (
        !cluster.promoted &&
        !hasSpineEntry(cluster.signature) &&
        promotionOccurrences >= PROMOTION_X &&
        promotionContexts    >= PROMOTION_Y
    ) {
        // Anti-overfitting invariant: a single entry cannot complete promotion alone
        // (checked by requiring at least 2 distinct member entries beyond current)
        const priorMembers = cluster.member_event_ids.filter(id => id !== entry.event_id);
        if (priorMembers.length >= PROMOTION_X - 1) {
            const windowMs = PROMOTION_Z_MS;
            const creationDays = Math.round(
                (now - Math.min(
                    ...getAllPeerEntries()
                        .filter(e => cluster!.member_event_ids.includes(e.event_id))
                        .map(e => e.timestamp),
                )) / (24 * 60 * 60 * 1000),
            );

            spine_entry = promoteToSpine({
                abstracted_pattern: generateAbstractedPattern(
                    entry.observed_noise_type,
                    entry.signal_discrepancy,
                    promotionContexts,
                    promotionOccurrences,
                ),
                origin_signature: cluster.signature,
                context_span: [
                    ...new Set(
                        getAllPeerEntries()
                            .filter(e =>
                                cluster!.member_event_ids.includes(e.event_id) &&
                                now - e.timestamp <= windowMs,
                            )
                            .map(e => e.interaction_context),
                    ),
                ],
                interpretive_effect: mapNoiseToIEV(
                    entry.observed_noise_type,
                    entry.signal_discrepancy,
                ),
                creation_window: `Observed over ${creationDays} day${creationDays !== 1 ? 's' : ''}`,
            });

            cluster.promoted = true;
            promotionCrossed = true;
            candidateCrossed = true; // Promotion supersedes Candidate
        }
    } else if (
        !promotionCrossed &&
        candidateOccurrences >= CANDIDATE_X &&
        candidateContexts    >= CANDIDATE_Y
    ) {
        // Candidate threshold crossed — IDS reflection signal only
        candidateCrossed = true;
    }

    return {
        peer_entry: entry,
        candidate_threshold_crossed: candidateCrossed,
        promotion_threshold_crossed: promotionCrossed,
        spine_entry,
        rate_limited: false,
        cluster_signature: cluster.signature,
        cluster_status: cluster.status,
        occurrence_count: promotionOccurrences,
        context_count: promotionContexts,
    };
}

// ── Query Operations ──────────────────────────────────────────────────────────

/** All pattern clusters — active, dormant, archived */
export function getAllClusters(): PatternCluster[] {
    return [..._patterns.values()];
}

/** Active clusters only (not dormant or archived) */
export function getActiveClusters(): PatternCluster[] {
    return [..._patterns.values()].filter(c => c.status === 'active');
}

/** Clusters that have been promoted to SPINE */
export function getPromotedClusters(): PatternCluster[] {
    return [..._patterns.values()].filter(c => c.promoted);
}

/** Get a specific cluster by its signature */
export function getCluster(signature: string): PatternCluster | undefined {
    return _patterns.get(signature);
}

/** Total cluster count */
export function clusterCount(): number {
    return _patterns.size;
}

// ── Test Utilities ────────────────────────────────────────────────────────────

/** Reset the in-memory pattern store between test runs. Never call in production. */
export function _resetPromoterForTesting(): void {
    _patterns.clear();
}
