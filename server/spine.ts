/**
 * spine.ts — SPINE: Stabilized Patterned Interpretive Nexus of Evidence
 *
 * Source: AEGIS Canon Addendum — SPINE v1.0-SP
 *
 * SPINE is the long-term structural memory layer. It stores abstracted, stable
 * interpretive constraints derived from repeated experiential evidence via PEER.
 *
 * Architecture invariants:
 *   - Append-only: entries are never deleted or retroactively modified
 *   - Slow-changing: written only via PEER → pattern → abstraction path
 *   - Incident-free: stores structure, not experience
 *   - Non-reactive: a single exchange cannot write to SPINE
 *   - Context-validated: pattern must appear in ≥3 distinct interaction contexts
 *   - Promotion-gated: requires X≥7, Y≥3, Z≤90d and abstraction
 *
 * SPINE is the sole origin of IEV (Interpretive Effect Vocabulary) effects.
 * SPINE bends the lens. It does not pull the reins.
 *
 * One sentence that defines SPINE:
 *   "SPINE is where uncertainty goes when it has proven it will not disappear."
 */

import type { IEVEffectName } from '../src/core/canon/aegis-iev.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type StabilityScore = 'provisional' | 'stable' | 'highly_stable';

/**
 * A single SPINE entry — an abstracted, stable interpretive constraint
 * that time refused to dismiss.
 *
 * All core fields are readonly. `stability_score` may be revised (only upward,
 * only with significant counter-evidence) but is never removed.
 * Nothing moves backward from SPINE to PEER.
 */
export interface SpineEntry {
    /**
     * UUID — immutable structural identity.
     * No semantic meaning. No versioning. "This insight exists."
     */
    readonly spine_id: string;
    /**
     * The heart of SPINE.
     * A concise, generalized description of what has proven recurrent and stable.
     * Not a summary of events — a distilled interpretive constraint.
     * No actors. No blame. No urgency. This is where wisdom lives.
     */
    readonly abstracted_pattern: string;
    /**
     * Reference to the recurrence_signature cluster in PEER that produced this entry.
     * Traceability and auditability without importing incidents or narrative.
     * Lineage, not memory.
     */
    readonly origin_signature: string;
    /**
     * The distinct interaction contexts in which this pattern appeared before promotion.
     * Justifies why the pattern is structural rather than situational.
     * Must contain ≥3 distinct values (Canon invariant).
     */
    readonly context_span: readonly string[];
    /**
     * Slow-moving robustness indicator.
     * Changes rarely and only with significant counter-evidence accumulated over time.
     * No numeric precision — precision tempts force.
     */
    stability_score: StabilityScore;
    /**
     * How this SPINE entry influences the system's interpretive lens.
     * Maps to one or more of the seven canonical IEV effects (max 3 active).
     * SPINE communicates through the IEV channel. It does not speak directly.
     */
    readonly interpretive_effect: readonly IEVEffectName[];
    /**
     * The time span over which supporting PEER evidence accumulated.
     * Format: "Observed over N days" or "Persisted across M months"
     * Encodes patience into the record.
     */
    readonly creation_window: string;
    /**
     * Conditions under which this entry may be reconsidered.
     * Prevents dogma. Every SPINE entry carries the terms of its own review.
     */
    readonly review_eligibility: string;
    /** Unix ms at time of promotion — when evidence finally crossed the threshold */
    readonly promoted_at: number;
}

// ── Append-Only Store ─────────────────────────────────────────────────────────
// VM-local session runtime mirror. DataQuad durability is preserved by the
// server-side Steward/Advocate path and IPFS, not by browser/cloud writes.

const _spine: SpineEntry[] = [];

// ── Core Write Operation ──────────────────────────────────────────────────────

/**
 * Promote a validated pattern cluster to SPINE by writing an abstracted entry.
 *
 * This is the ONLY valid write path to SPINE. It is called by the peer-spine-promoter
 * after a PEER pattern cluster has crossed the Promotion threshold (X≥7, Y≥3, Z≤90d)
 * and abstraction has been performed.
 *
 * Direct writes from any other source violate Canon Invariant 3.
 *
 * @returns The newly created SpineEntry
 */
export function promoteToSpine(params: {
    abstracted_pattern: string;
    origin_signature: string;
    context_span: string[];
    interpretive_effect: IEVEffectName[];
    creation_window: string;
    review_eligibility?: string;
    stability_score?: StabilityScore;
}): SpineEntry {
    const entry: SpineEntry = {
        spine_id: globalThis.crypto.randomUUID(),
        abstracted_pattern: params.abstracted_pattern,
        origin_signature: params.origin_signature,
        context_span: [...params.context_span],
        stability_score: params.stability_score ?? 'provisional',
        interpretive_effect: [...params.interpretive_effect],
        creation_window: params.creation_window,
        review_eligibility:
            params.review_eligibility ??
            'Re-review if contradicted by ≥3 stable counter-patterns',
        promoted_at: Date.now(),
    };
    _spine.push(entry);
    return entry;
}

// ── Query Operations ──────────────────────────────────────────────────────────

/** All SPINE entries in promotion order */
export function getAllSpineEntries(): SpineEntry[] {
    return [..._spine];
}

/** SPINE entries matching a specific origin_signature */
export function getSpineByOrigin(origin_signature: string): SpineEntry[] {
    return _spine.filter(e => e.origin_signature === origin_signature);
}

/** Whether a given signature already has a SPINE entry (prevents re-promotion) */
export function hasSpineEntry(origin_signature: string): boolean {
    return _spine.some(e => e.origin_signature === origin_signature);
}

/** Total SPINE entry count */
export function spineCount(): number {
    return _spine.length;
}

// ── Test Utilities ────────────────────────────────────────────────────────────

/**
 * Load a pre-existing SpineEntry into the in-memory store.
 * Used for VM-local/IPFS hydration — preserves all original fields.
 * Skips if an entry with the same spine_id is already present (idempotent).
 */
export function loadSpineEntry(entry: SpineEntry): void {
    if (_spine.some(e => e.spine_id === entry.spine_id)) return;
    _spine.push(entry);
}

/** Reset the in-memory store between test runs. Never call in production. */
export function _resetSpineForTesting(): void {
    _spine.length = 0;
}
