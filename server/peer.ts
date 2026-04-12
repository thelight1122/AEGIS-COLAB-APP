/**
 * peer.ts — PEER: Patterned Experiential Evidence Repository
 *
 * Source: AEGIS Canon Addendum — PEER v1.0-P
 *         PEER — Canonical Entry Field Definition (v1 · Research Phase)
 *
 * PEER is the first tensor of the DataQuad's Soul axis. Every meaningful exchange
 * produces a PEER entry. Nothing is filtered out at the record level. PEER is
 * append-only, incident-level, and non-interpretive.
 *
 * Architecture invariants:
 *   - Append-only: entries are never deleted, overwritten, or retroactively modified
 *   - Incident-level: each entry represents one moment — not a pattern
 *   - Non-interpretive: PEER records what happened; it does not conclude
 *   - No force fields: no rewards, penalties, scores, urgency, compliance
 *   - Every entry carries a recurrence_signature for downstream pattern matching
 *
 * One sentence that defines PEER entries:
 *   "A PEER entry is a record of something that didn't settle — preserved so
 *    it can settle honestly later."
 */

import { randomUUID } from 'crypto';
import type { ExchangeRole } from './steward-core.js';
import type { CentrifugeResult } from './centrifuge.js';
import type { IBLResult } from './ibl.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NoiseType =
    | 'symbolic_compression'
    | 'affect_logic_mismatch'
    | 'ambiguity_amplification'
    | 'interpretive_resistance'
    | 'guardrail_friction'
    | 'unresolved_contradiction'
    | 'hesitation_loop'
    | 'contextual_drift'
    | 'none';

export type SignalDiscrepancy =
    | 'intent_vs_expression'
    | 'meaning_vs_interpretation'
    | 'clarity_vs_constraint'
    | 'affect_vs_structure'
    | 'none';

export type AffectivePresence =
    | 'low'
    | 'medium'
    | 'high'
    | 'neutral'
    | 'compressed'
    | 'expansive';

export type ResolutionState =
    | 'unresolved'
    | 'partially_settled'
    | 'deferred'
    | 'naturally_resolved';

export type ObserverConfidence = 'tentative' | 'moderate' | 'high';

export type InteractionContext =
    | 'conversational'
    | 'task_execution'
    | 'reflective_pause'
    | 'boundary_enforcement'
    | 'symbolic_interpretation'
    | 'unknown';

/**
 * A single PEER entry — one preserved moment of unresolved experience.
 *
 * Core fields are readonly. `weight` is mutable for decay application.
 * Nothing moves backward from SPINE to PEER.
 * The recurrence_signature is the key for downstream pattern clustering.
 */
export interface PeerEntry {
    /** UUID — immutable identity. No semantic meaning. No hierarchy. */
    readonly event_id: string;
    /** Unix ms — temporal grounding only. Time is context, not pressure. */
    readonly timestamp: number;
    /** Where this occurred — enables cross-context pattern matching */
    readonly interaction_context: InteractionContext;
    /** The kind of instability observed — descriptive, not a verdict */
    readonly observed_noise_type: NoiseType;
    /** What didn't line up — two signals diverged. No cause assigned. */
    readonly signal_discrepancy: SignalDiscrepancy;
    /** Scalar charge indicator — not emotion simulation, just presence */
    readonly affective_presence: AffectivePresence;
    /** Closure state — most entries remain unresolved. That is the point. */
    readonly resolution_status: ResolutionState;
    /**
     * Pattern detection key — derived from noise_type + discrepancy + context.
     * Backbone of PEER → SPINE promotion.
     * Format: "{noise_type}:{discrepancy}:{context}"
     */
    readonly recurrence_signature: string;
    /** Structural confidence indicator — prevents false certainty */
    readonly observer_confidence: ObserverConfidence;
    /** Optional margin note — raw texture only. No conclusions. No recommendations. */
    readonly notes?: string;
    /** Which exchange role produced this entry */
    readonly role: ExchangeRole;
    /**
     * Decay weight — starts at 1.0, half-life 14 days.
     * Old entries still exist (append-only) but contribute less to pattern mass.
     */
    weight: number;
}

// ── Append-Only Store ─────────────────────────────────────────────────────────
// In-memory for session runtime. Firebase handles durability.

const _peer: PeerEntry[] = [];

// ── Recurrence Signature ──────────────────────────────────────────────────────

/**
 * Generate a deterministic recurrence_signature from the three primary fields.
 * Format: "{noise_type}:{discrepancy}:{context}"
 *
 * This is the backbone of pattern detection. Entries with the same or similar
 * signatures cluster into patterns for PEER → SPINE promotion.
 */
export function makeRecurrenceSignature(
    noise_type: NoiseType,
    discrepancy: SignalDiscrepancy,
    context: InteractionContext,
): string {
    return `${noise_type}:${discrepancy}:${context}`;
}

// ── Inference Helpers ─────────────────────────────────────────────────────────
// Conservative inference — defaults to 'none' when no clear signal.
// These are observations, not verdicts.

/** Infer noise type from IBL posture and centrifuge bleed detections */
function inferNoiseType(
    ibl_result: IBLResult,
    centrifuge_result: CentrifugeResult,
): NoiseType {
    // IBL posture signals (posture-to-noise mapping)
    if (ibl_result.posture === 'Collapsing')       return 'interpretive_resistance';
    if (ibl_result.posture === 'Frictional')        return 'guardrail_friction';
    if (ibl_result.posture === 'CreativeExpansion') return 'symbolic_compression';

    // Centrifuge bleed signals (bleed-to-noise mapping)
    for (const bleed of centrifuge_result.bleeds) {
        if (bleed.kind === 'Reactive Output')               return 'affect_logic_mismatch';
        if (bleed.kind === 'Certainty Inflation')           return 'ambiguity_amplification';
        if (bleed.kind === 'Directive Drift')               return 'contextual_drift';
        if (bleed.kind === 'Optimization Pressure Residue') return 'unresolved_contradiction';
    }

    return 'none';
}

/** Infer signal discrepancy from IBL posture and centrifuge bleeds */
function inferSignalDiscrepancy(
    ibl_result: IBLResult,
    centrifuge_result: CentrifugeResult,
): SignalDiscrepancy {
    // Bleed signals
    for (const bleed of centrifuge_result.bleeds) {
        if (bleed.kind === 'Reactive Output')     return 'affect_vs_structure';
        if (bleed.kind === 'Certainty Inflation') return 'clarity_vs_constraint';
    }

    // IBL posture signals
    if (ibl_result.posture === 'Collapsing')  return 'meaning_vs_interpretation';
    if (ibl_result.posture === 'Frictional')  return 'intent_vs_expression';

    return 'none';
}

/** Infer interaction context from IBL posture */
function inferInteractionContext(ibl_result: IBLResult): InteractionContext {
    switch (ibl_result.posture) {
        case 'Exploratory':      return 'conversational';
        case 'Constructive':     return 'task_execution';
        case 'Frictional':       return 'boundary_enforcement';
        case 'Collapsing':       return 'boundary_enforcement';
        case 'CreativeExpansion':return 'symbolic_interpretation';
        default:                 return 'conversational';
    }
}

/** Infer affective presence from affect hint intensity */
function inferAffectivePresence(intensity?: number): AffectivePresence {
    if (intensity === undefined) return 'neutral';
    if (intensity >= 0.7) return 'high';
    if (intensity >= 0.4) return 'medium';
    if (intensity > 0)    return 'low';
    return 'neutral';
}

// ── Core Entry Creation ───────────────────────────────────────────────────────

/**
 * Create and append a PEER entry from an exchange.
 *
 * Called by the pipeline on every exchange that produces signal.
 * The entry is immediately append-only. No conclusions are asserted.
 *
 * @returns The newly created PeerEntry
 */
export function recordPeerEntry(params: {
    role: ExchangeRole;
    ibl_result: IBLResult;
    centrifuge_result: CentrifugeResult;
    affect_intensity?: number;
    notes?: string;
}): PeerEntry {
    const { role, ibl_result, centrifuge_result, affect_intensity, notes } = params;

    const noise_type = inferNoiseType(ibl_result, centrifuge_result);
    const discrepancy = inferSignalDiscrepancy(ibl_result, centrifuge_result);
    const context = inferInteractionContext(ibl_result);
    const recurrence_signature = makeRecurrenceSignature(noise_type, discrepancy, context);

    // Resolution status — no signal means naturally resolved; any noise is unresolved
    const resolution_status: ResolutionState =
        noise_type === 'none' ? 'naturally_resolved' : 'unresolved';

    // Observer confidence — inferred from bleed count and noise clarity
    const bleeds_count = centrifuge_result.bleeds.length;
    const observer_confidence: ObserverConfidence =
        bleeds_count === 0 && noise_type === 'none' ? 'high'
        : bleeds_count <= 1                          ? 'moderate'
        : 'tentative';

    const entry: PeerEntry = {
        event_id: randomUUID(),
        timestamp: Date.now(),
        interaction_context: context,
        observed_noise_type: noise_type,
        signal_discrepancy: discrepancy,
        affective_presence: inferAffectivePresence(affect_intensity),
        resolution_status,
        recurrence_signature,
        observer_confidence,
        notes,
        role,
        weight: 1.0,
    };

    _peer.push(entry);
    return entry;
}

// ── Decay ─────────────────────────────────────────────────────────────────────
// Source: Recurrence and Decay Rules v1 Research Spec

/** Half-life: 14 days. Old entries fade without shame — not punishment, just relevance. */
export const PEER_HALF_LIFE_DAYS = 14;
const PEER_HALF_LIFE_MS = PEER_HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Compute the current decay weight for a PEER entry given the current time.
 *   w = 1.0 × (0.5 ^ (elapsed_ms / half_life_ms))
 *
 * At 0d: w ≈ 1.0   At 14d: w ≈ 0.5   At 28d: w ≈ 0.25
 */
export function computeDecayWeight(entry: PeerEntry, now: number = Date.now()): number {
    const elapsed = now - entry.timestamp;
    return Math.pow(0.5, elapsed / PEER_HALF_LIFE_MS);
}

/**
 * Apply decay to all entries in the store, updating their weight field.
 * Called by the promoter before each pattern mass computation.
 */
export function applyDecayToAll(now: number = Date.now()): void {
    for (const entry of _peer) {
        entry.weight = computeDecayWeight(entry, now);
    }
}

// ── Query Operations ──────────────────────────────────────────────────────────

/** All PEER entries in append order */
export function getAllPeerEntries(): PeerEntry[] {
    return [..._peer];
}

/** All entries matching a specific recurrence_signature */
export function getEntriesBySignature(signature: string): PeerEntry[] {
    return _peer.filter(e => e.recurrence_signature === signature);
}

/** All distinct recurrence_signatures present in the store */
export function getDistinctSignatures(): string[] {
    return [...new Set(_peer.map(e => e.recurrence_signature))];
}

/** Total PEER entry count */
export function peerCount(): number {
    return _peer.length;
}

// ── Test Utilities ────────────────────────────────────────────────────────────

/** Reset the in-memory store between test runs. Never call in production. */
export function _resetPeerForTesting(): void {
    _peer.length = 0;
}
