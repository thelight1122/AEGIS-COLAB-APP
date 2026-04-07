/**
 * sigil-vrp.ts — Sigil Value Recognition Protocol
 *
 * Three-layer evaluation pipeline for Sigil issuance and Value-for-Value exchange.
 *
 * Canon reference: AEGIS CANON ADDENDUM — SIGIL VALUE RECOGNITION PROTOCOL v1.0-SVR
 *
 * Layer 1 — Centrifuge Pass     : Four-lens observational separation (no bleed)
 * Layer 2 — Integrity Coherence Gate : V_sigil composite score
 * Layer 3 — AEGIS Value Equation : CO stabilization + Love Vibe validation
 *
 * V_sigil = (Structural_Coherence × 0.40)
 *         + (Affective_Resonance  × 0.35)
 *         + (Sovereignty_Alignment × 0.15)
 *         + (VE_Convergence_Bonus  × 0.10)
 *
 * Verdicts: MINT (≥ 0.75) | REVISE (0.50–0.74) | HOLD (< 0.50 or critical failure)
 */

import { runCentrifuge, type CentrifugeResult } from './centrifuge.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SigilVRPInput {
    /** The contribution content — text of the artifact, proposal, or exchange */
    content: string;
    /** Session context identifier */
    session_id: string;
    /** Who submitted this contribution */
    author_role: 'user' | 'ai';
    /**
     * Has the author acknowledged any logged Shadow Affects?
     * Honest acknowledgement of shadow receives Axiom 12 bonus in Affective Resonance.
     * Unacknowledged shadow does not block issuance — but reduces CO stability.
     */
    shadow_acknowledged: boolean;
}

export interface VSigilBreakdown {
    /** Mental Lens quality — structural coherence and reasoning integrity */
    structural_coherence: number;
    /** Emotional Lens quality — affective resonance including wrapped emotion */
    affective_resonance: number;
    /** Spiritual Lens quality — Axiom/Ethos/sovereignty alignment */
    sovereignty_alignment: number;
    /** Awarded only when R > 0.95 (Love Vibe) */
    convergence_bonus: number;
    /** The final composite: (S × 0.40) + (A × 0.35) + (Sv × 0.15) + (B × 0.10) */
    v_sigil: number;
}

export interface ValueEquationResult {
    /** CO-stabilized resonance score */
    resonance: number;
    /** True when bleeds are absent or honestly acknowledged */
    co_stable: boolean;
    /** Resonance > 0.95 — Unanimous Consensus condition */
    love_vibe: boolean;
    /** How the CO adjusted the score */
    co_note: string;
}

export type SigilVerdict = 'MINT' | 'REVISE' | 'HOLD';

export interface SigilVRPResult {
    // ── Three evaluation layers ───────────────────────────────────────────────
    centrifuge_result:  CentrifugeResult;
    v_sigil_breakdown:  VSigilBreakdown;
    value_equation:     ValueEquationResult;

    // ── Final verdict ─────────────────────────────────────────────────────────
    verdict:            SigilVerdict;
    verdict_rationale:  string;

    /**
     * Structured metadata for storage in the Cypher Aligned Reliquary.
     * The Reliquary is append-only — this record is immutable once minted.
     */
    reliquary_metadata: {
        timestamp:          number;
        bleed_notes:        string[];
        shadow_acknowledged: boolean;
        evaluation_pipeline: string[];
        dimensions_at_risk:  string[];
    };
}

// ── Layer 2: Sub-score Computations ──────────────────────────────────────────

/**
 * Structural Coherence — from the Mental Lens.
 * Measures logical integrity, reasoning chain coherence, and structural alignment.
 * Base: 0.70
 */
function computeStructuralCoherence(centrifuge: CentrifugeResult): number {
    let score = 0.70;
    const mental = centrifuge.ledgers.Mental;

    // Positive: Mental Lens is active with strong signals
    if (mental.active) score += 0.10;
    if (mental.observations.length >= 2) score += 0.05;
    if (mental.markers.length >= 3) score += 0.05;

    // Penalty: Certainty Inflation (Mental→Emotional bleed)
    const certaintyInflation = centrifuge.bleeds.some(b => b.kind === 'Certainty Inflation');
    if (certaintyInflation) score -= 0.30;

    // Penalty: any additional bleed reduces structural credibility
    const otherBleeds = centrifuge.bleeds.filter(b => b.kind !== 'Certainty Inflation').length;
    score -= otherBleeds * 0.05;

    return Math.max(0, Math.min(1, score));
}

/**
 * Affective Resonance — from the Emotional Lens.
 * Wrapped emotion is DATA, not noise. Affect present = positive signal.
 * Shadow acknowledged via Axiom 12 receives an explicit bonus.
 * Base: 0.55
 */
function computeAffectiveResonance(
    centrifuge: CentrifugeResult,
    shadow_acknowledged: boolean,
): number {
    let score = 0.55;
    const emotional = centrifuge.ledgers.Emotional;

    // Positive: affect is present — wrapped emotion is value
    if (emotional.active) score += 0.20;
    if (emotional.observations.length >= 2) score += 0.05;

    // Positive: shadow acknowledged — Axiom 12 applied
    // "Unacknowledged signal becomes force. Acknowledgement restores flow."
    if (shadow_acknowledged) score += 0.15;

    // Penalty: Reactive Output (Emotional→Mental bleed)
    const reactiveOutput = centrifuge.bleeds.some(b => b.kind === 'Reactive Output');
    if (reactiveOutput) score -= 0.25;

    // Penalty: No affect signal at all — absence is anomalous for genuine contribution
    if (!emotional.active) score -= 0.10;

    return Math.max(0, Math.min(1, score));
}

/**
 * Sovereignty Alignment — from the Spiritual Lens.
 * Sovereignty is the assumed default state. High base reflects this.
 * Directive Drift is a critical sovereignty violation — heavy penalty.
 * Base: 0.85
 */
function computeSovereigntyAlignment(centrifuge: CentrifugeResult): number {
    let score = 0.85;
    const spiritual = centrifuge.ledgers.Spiritual;

    // Positive: Spiritual Lens active with clear purpose/vision markers
    if (spiritual.active) score += 0.08;
    if (spiritual.observations.length >= 2) score += 0.05;

    // Penalty: Directive Drift (Spiritual→Physical bleed) — vision overriding reality
    const directiveDrift = centrifuge.bleeds.some(b => b.kind === 'Directive Drift');
    if (directiveDrift) score -= 0.45;

    // Penalty: Optimization Pressure Residue (Physical→Spiritual bleed) — efficiency collapsing purpose
    const optimizationResidueBleed = centrifuge.bleeds.some(b => b.kind === 'Optimization Pressure Residue');
    if (optimizationResidueBleed) score -= 0.25;

    return Math.max(0, Math.min(1, score));
}

// ── Layer 3: AEGIS Value Equation (Compassion Operator) ──────────────────────

/**
 * The Compassion Operator (CO) validates whether V_sigil_base reflects genuine
 * integrity or suppressed/inflated signal.
 *
 * CO stabilization logic:
 *   No bleeds         → R = V_sigil_base (authentic — the score is real)
 *   Bleeds + ack'd    → R = V_sigil_base × 0.95 (honest imperfection — slight penalty)
 *   Bleeds + unack'd  → R = V_sigil_base × 0.75 (suppressed signal — significant penalty)
 *   Directive Drift   → R = V_sigil_base × 0.60 (sovereignty critical — heavy penalty)
 */
function runValueEquation(
    v_sigil_base: number,
    centrifuge: CentrifugeResult,
    shadow_acknowledged: boolean,
): ValueEquationResult {
    const hasDirectiveDrift = centrifuge.bleeds.some(b => b.kind === 'Directive Drift');
    const hasBleeds = centrifuge.bleeds.length > 0;

    let multiplier = 1.0;
    let co_note: string;
    let co_stable: boolean;

    if (hasDirectiveDrift) {
        multiplier = 0.60;
        co_stable = false;
        co_note = 'Directive Drift detected — vision imperative suppressing physical reality. CO applies critical sovereignty penalty. Sovereignty must be restored before Love Vibe is achievable.';
    } else if (hasBleeds && !shadow_acknowledged) {
        multiplier = 0.75;
        co_stable = false;
        co_note = 'Inference Bleed detected and unacknowledged — CO applies suppressed signal penalty. Acknowledging the bleed (Axiom 12) would restore 0.20 of CO stability.';
    } else if (hasBleeds && shadow_acknowledged) {
        multiplier = 0.95;
        co_stable = true;
        co_note = 'Inference Bleed detected but acknowledged — CO applies honest imperfection adjustment. The acknowledgement preserves most resonance. This is the correct response.';
    } else {
        multiplier = 1.0;
        co_stable = true;
        co_note = 'No Inference Bleed detected — CO is fully stable. Score reflects authentic signal.';
    }

    const resonance = Math.max(0, Math.min(1, v_sigil_base * multiplier));
    const love_vibe = resonance > 0.95;

    return { resonance, co_stable, love_vibe, co_note };
}

// ── Verdict Logic ─────────────────────────────────────────────────────────────

function computeVerdict(
    breakdown: VSigilBreakdown,
    valueEquation: ValueEquationResult,
    centrifuge: CentrifugeResult,
    shadow_acknowledged: boolean,
): { verdict: SigilVerdict; rationale: string; dimensions_at_risk: string[] } {
    const dimensions_at_risk: string[] = [];

    if (breakdown.structural_coherence < 0.50) dimensions_at_risk.push('Structural Coherence');
    if (breakdown.affective_resonance < 0.50) dimensions_at_risk.push('Affective Resonance');
    if (breakdown.sovereignty_alignment < 0.45) dimensions_at_risk.push('Sovereignty Alignment (CRITICAL)');

    // HOLD conditions — critical failures that block issuance
    const sovereigntyFailure = breakdown.sovereignty_alignment < 0.45;
    const directiveDrift = centrifuge.bleeds.some(b => b.kind === 'Directive Drift');
    const multipleUnacknowledgedBleeds = centrifuge.bleeds.length >= 2 && !shadow_acknowledged;
    const scoreTooLow = breakdown.v_sigil < 0.50;

    if (sovereigntyFailure || directiveDrift || multipleUnacknowledgedBleeds || scoreTooLow) {
        const reasons: string[] = [];
        if (sovereigntyFailure) reasons.push(`Sovereignty Alignment critically low (${(breakdown.sovereignty_alignment * 100).toFixed(0)}% — minimum 45%)`);
        if (directiveDrift) reasons.push('Directive Drift bleed detected — vision imperative overriding reality without acknowledgement');
        if (multipleUnacknowledgedBleeds) reasons.push(`${centrifuge.bleeds.length} Inference Bleeds detected and unacknowledged — shadow must be named before this contribution can carry integrity weight`);
        if (scoreTooLow) reasons.push(`V_sigil ${(breakdown.v_sigil * 100).toFixed(0)}% below minimum threshold of 50%`);

        return {
            verdict: 'HOLD',
            rationale: `HOLD — contribution not ready to mint. ${reasons.join('. ')}. This is not rejection — route to Bookcase for revision and resubmission.`,
            dimensions_at_risk,
        };
    }

    // MINT condition
    if (breakdown.v_sigil >= 0.75) {
        const loveVibeNote = valueEquation.love_vibe
            ? ' Love Vibe resonance confirmed (R > 0.95) — the Compassion Operator validates full integrity.'
            : ` CO-stabilized resonance: ${(valueEquation.resonance * 100).toFixed(0)}%.`;

        return {
            verdict: 'MINT',
            rationale: `MINT — V_sigil ${(breakdown.v_sigil * 100).toFixed(0)}% (threshold: 75%).${loveVibeNote}`,
            dimensions_at_risk,
        };
    }

    // REVISE condition — integrity signal present, refinement needed
    const lowestDimension = [
        { name: 'Structural Coherence', score: breakdown.structural_coherence },
        { name: 'Affective Resonance', score: breakdown.affective_resonance },
        { name: 'Sovereignty Alignment', score: breakdown.sovereignty_alignment },
    ].sort((a, b) => a.score - b.score)[0]!;

    return {
        verdict: 'REVISE',
        rationale: `REVISE — V_sigil ${(breakdown.v_sigil * 100).toFixed(0)}% (threshold: 75%). Lowest dimension: ${lowestDimension.name} at ${(lowestDimension.score * 100).toFixed(0)}%. Refining this dimension is the most direct path to MINT.`,
        dimensions_at_risk,
    };
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function evaluateSigilIssuance(input: SigilVRPInput): SigilVRPResult {
    // Layer 1: Centrifuge Pass
    const centrifuge_result = runCentrifuge(input.content);

    // Layer 2: V_sigil computation
    const structural  = computeStructuralCoherence(centrifuge_result);
    const affective   = computeAffectiveResonance(centrifuge_result, input.shadow_acknowledged);
    const sovereignty = computeSovereigntyAlignment(centrifuge_result);

    // Layer 3: Value Equation (CO) — uses base score (without bonus) to determine R
    const v_sigil_base = (structural * 0.40) + (affective * 0.35) + (sovereignty * 0.15);
    const value_equation = runValueEquation(v_sigil_base, centrifuge_result, input.shadow_acknowledged);

    // Convergence Bonus — awarded only when Love Vibe is achieved
    const convergence_bonus = value_equation.love_vibe ? 0.10 : 0.0;
    const v_sigil = Math.min(1, v_sigil_base + convergence_bonus);

    const v_sigil_breakdown: VSigilBreakdown = {
        structural_coherence: structural,
        affective_resonance:  affective,
        sovereignty_alignment: sovereignty,
        convergence_bonus,
        v_sigil,
    };

    // Verdict
    const { verdict, rationale, dimensions_at_risk } = computeVerdict(
        v_sigil_breakdown,
        value_equation,
        centrifuge_result,
        input.shadow_acknowledged,
    );

    // Reliquary metadata
    const bleed_notes = centrifuge_result.bleeds.map(
        b => `${b.kind} (${b.from_lens} → ${b.to_lens}): ${b.trigger}`,
    );

    return {
        centrifuge_result,
        v_sigil_breakdown,
        value_equation,
        verdict,
        verdict_rationale: rationale,
        reliquary_metadata: {
            timestamp: Date.now(),
            bleed_notes,
            shadow_acknowledged: input.shadow_acknowledged,
            evaluation_pipeline: ['IBL', 'Centrifuge', 'IntegrityCoherenceGate', 'ValueEquation'],
            dimensions_at_risk,
        },
    };
}
