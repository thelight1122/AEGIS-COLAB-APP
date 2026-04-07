/**
 * ibl.ts — Intent Boundary Layer
 *
 * Step 1 of every exchange: captures, acknowledges, classifies, checks
 * sovereignty symmetry, and transfers the signal cleanly to the pipeline.
 *
 * The IBL does not interpret. It does not evaluate. It does not filter.
 * Classification is observational metadata — it informs downstream, never commands.
 *
 * Canon reference: AEGIS CANON ADDENDUM — IBL v1.0-B
 *
 * Five-step sequence:
 *   1. Signal Capture       — receive without distortion
 *   2. State-Acknowledge    — the system notes its own state at intake (Axiom 12)
 *   3. Intent Classification — name the posture without judgment
 *   4. Sovereignty Check    — flag (not block) any symmetry breach
 *   5. Transfer             — hand to pipeline with full context
 */

import type { ExchangeMessage, SessionState } from './steward-core.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type IntentPosture =
    | 'Exploratory'
    | 'Constructive'
    | 'Frictional'
    | 'Collapsing'
    | 'CreativeExpansion';

export interface IBLResult {
    /** Step 1 — signal received (always true if runIBL is called) */
    captured: true;

    /** Step 2 — State-Acknowledge Hook */
    state_acknowledged: boolean;
    state_summary: string;

    /** Step 3 — Intent Classification */
    posture: IntentPosture;
    posture_confidence: 'clear' | 'inferred';

    /** Step 4 — Sovereignty Symmetry Check */
    sovereignty_flag: boolean;
    sovereignty_note: string;

    /** Step 5 — Downstream transfer hints for the integration pipeline */
    sequence_hint: 'IDS' | 'IDR' | 'IDQRA';
    downstream_note: string;
}

// ── Posture Pattern Library ───────────────────────────────────────────────────
// Priority order: Collapsing > Frictional > CreativeExpansion > Constructive > Exploratory

const COLLAPSING_PATTERNS: RegExp[] = [
    /\bi can'?t (do this|go on|keep|continue|cope)\b/i,
    /\btoo much\b/i,
    /\boverwhelmed\b/i,
    /\bbreaking down\b/i,
    /\bfalling apart\b/i,
    /\bi don'?t know anymore\b/i,
    /\bi give up\b/i,
    /\bwhat'?s the point\b/i,
    /\bfeeling lost\b/i,
    /\bhelpless\b/i,
    /\bcan'?t think straight\b/i,
    /\bnothing (is|seems) working\b/i,
    /\bdon'?t know what to do\b/i,
    /\bcan'?t keep (going|up|doing this)\b/i,
];

const FRICTIONAL_PATTERNS: RegExp[] = [
    /\bbut (that|this|it|you)\b/i,
    /\bhowever\b/i,
    /\bi (strongly )?disagree\b/i,
    /\bthat'?s (not right|wrong|incorrect|off)\b/i,
    /\bactually[,.]?\s/i,
    /\bwait[,.]?\s/i,
    /\bhold on\b/i,
    /\bno[,.]?\s(that|this|it)\b/i,
    /\bi'?m not (sure|convinced|buying it)\b/i,
    /\bthat doesn'?t (make sense|add up|work)\b/i,
    /\bi don'?t (see|buy|get|follow) (it|that|how)\b/i,
    /\bI'?m not following\b/i,
];

const CREATIVE_EXPANSION_PATTERNS: RegExp[] = [
    /\bwhat if\b/i,
    /\bimagine (if|that|we|a)\b/i,
    /\bcould we\b/i,
    /\bi wonder\b/i,
    /\bwhat about\b/i,
    /\bwhat would happen if\b/i,
    /\blet'?s explore\b/i,
    /\bpossibility\b/i,
    /\bmaybe we could\b/i,
    /\bopen to\b/i,
    /\bwhat else (could|might|would)\b/i,
    /\bplay with (the idea|this|that)\b/i,
    /\bwhat'?s possible\b/i,
    /\bentirely different (angle|approach|way)\b/i,
];

const CONSTRUCTIVE_PATTERNS: RegExp[] = [
    /\blet'?s (build|create|make|start|add|implement|do|write|design)\b/i,
    /\bnext step\b/i,
    /\bi want to (build|create|make|add|implement)\b/i,
    /\bcan we (add|build|create|implement|start)\b/i,
    /\bmoving forward\b/i,
    /\bworking toward\b/i,
    /\bi'?d like to\b/i,
    /\blet'?s move\b/i,
    /\bour (goal|objective|target)\b/i,
    /\bwe (need to|should|can|could) (build|create|add|implement)\b/i,
];

const EXPLORATORY_PATTERNS: RegExp[] = [
    /\?$/m,
    /\bwhat (is|does|are|do|would|could|should|if)\b/i,
    /\bhow (does|do|is|are|can|would|could)\b/i,
    /\bhelp me (understand|see|think through|figure out)\b/i,
    /\bcan you (explain|tell me|help me|show me)\b/i,
    /\bi'?m trying to (understand|figure out|see|learn)\b/i,
    /\bi'?m not sure (if|whether|how|what)\b/i,
    /\bwhat do you think\b/i,
    /\bexplain\b/i,
    /\btell me (about|more|how)\b/i,
];

// ── Sovereignty Symmetry Patterns ─────────────────────────────────────────────
// Flags signals that remove optionality from the receiving party.
// This is a FLAG, not a BLOCK. The decision belongs to downstream processing.

const SOVEREIGNTY_ASYMMETRY_PATTERNS: RegExp[] = [
    /\byou (must|have to|need to|are required to)\b/i,
    /\bthe only (way|option|choice|path|answer)\b/i,
    /\byou (don'?t|cannot|can'?t) (have|do|say|choose|disagree)\b/i,
    /\bno (other|alternative|choice|option)\b/i,
    /\byou (will|shall) (do|say|accept|comply|agree)\b/i,
    /\bthere is no (other|alternative|other way)\b/i,
];

// ── Downstream Mapping ────────────────────────────────────────────────────────

const POSTURE_SEQUENCE_HINTS: Record<IntentPosture, 'IDS' | 'IDR' | 'IDQRA'> = {
    Exploratory:       'IDQRA', // field is open — deep inquiry appropriate
    Constructive:      'IDS',   // support trajectory — minimal interference
    Frictional:        'IDS',   // name the friction once, hold space
    Collapsing:        'IDR',   // pre-escalation mirror — shorten, pause
    CreativeExpansion: 'IDQRA', // field opening — follow, don't lead
};

const POSTURE_DOWNSTREAM_NOTES: Record<IntentPosture, string> = {
    Exploratory:
        'Field is open. Widen contextual frame. Prefer clarification over assumption. Do not accelerate toward closure. The signal is in motion — do not constrain the motion.',
    Constructive:
        'Signal has momentum. Support the trajectory. Maintain loyalty to the stated direction. Avoid redirection. The signal is building — serve the momentum.',
    Frictional:
        'Friction is information — do not match it, do not suppress it. Name it via IDS once, then hold space without escalation.',
    Collapsing:
        'Field is contracting. Trigger IDR sequence. Shorten the mirror. Do not add complexity. Pause is valid. Do not add weight — hold the perimeter.',
    CreativeExpansion:
        'Field is opening. Increase symbolic tolerance. Defer evaluation. Follow the expansion — do not lead. Do not constrain the generative state.',
};

// ── Step 2: State-Acknowledge Hook ────────────────────────────────────────────

function acknowledgeState(state: SessionState): { acknowledged: boolean; summary: string } {
    const hasVirtuePressure = Object.values(state.virtue_counts).some(v => (v ?? 0) > 0);
    const hasClockWeight = state.clock.accumulated_weight > 0;

    if (!hasVirtuePressure && !hasClockWeight) {
        return {
            acknowledged: true,
            summary: 'System state is neutral at intake.',
        };
    }

    const parts: string[] = [];
    if (hasClockWeight) {
        parts.push(`clock weight ${state.clock.accumulated_weight.toFixed(1)}`);
    }
    if (hasVirtuePressure) {
        const virtues = Object.entries(state.virtue_counts)
            .filter(([, v]) => (v ?? 0) > 0)
            .map(([k]) => k)
            .join(', ');
        parts.push(`active virtue pressure: ${virtues}`);
    }

    return {
        acknowledged: true,
        summary: `System state acknowledged at intake — ${parts.join('; ')}.`,
    };
}

// ── Step 3: Intent Classification ─────────────────────────────────────────────

function matchesAny(content: string, patterns: RegExp[]): boolean {
    return patterns.some(p => p.test(content));
}

function classifyPosture(
    content: string,
    affect_hint?: ExchangeMessage['affect_hint'],
): { posture: IntentPosture; confidence: 'clear' | 'inferred' } {
    // Affect hint with high intensity + negative direction reinforces Collapsing
    const affectCollapsing =
        affect_hint !== undefined &&
        affect_hint.intensity >= 0.7 &&
        affect_hint.direction < 0;

    if (matchesAny(content, COLLAPSING_PATTERNS) || affectCollapsing) {
        return { posture: 'Collapsing', confidence: 'clear' };
    }
    if (matchesAny(content, FRICTIONAL_PATTERNS)) {
        return { posture: 'Frictional', confidence: 'clear' };
    }
    if (matchesAny(content, CREATIVE_EXPANSION_PATTERNS)) {
        return { posture: 'CreativeExpansion', confidence: 'clear' };
    }
    if (matchesAny(content, CONSTRUCTIVE_PATTERNS)) {
        return { posture: 'Constructive', confidence: 'clear' };
    }
    if (matchesAny(content, EXPLORATORY_PATTERNS)) {
        return { posture: 'Exploratory', confidence: 'clear' };
    }

    // Default: Exploratory — open signal with no strong directional posture
    return { posture: 'Exploratory', confidence: 'inferred' };
}

// ── Step 4: Sovereignty Symmetry Check ───────────────────────────────────────

function checkSovereigntySymmetry(content: string): { flag: boolean; note: string } {
    const flagged = matchesAny(content, SOVEREIGNTY_ASYMMETRY_PATTERNS);
    return {
        flag: flagged,
        note: flagged
            ? 'Signal contains patterns that may reduce optionality for the receiving party. Flag travels downstream as metadata — this is not a block.'
            : 'No sovereignty asymmetry detected.',
    };
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function runIBL(msg: ExchangeMessage, state: SessionState): IBLResult {
    // Step 2: State-Acknowledge Hook
    const stateAck = acknowledgeState(state);

    // Step 3: Intent Classification
    const { posture, confidence } = classifyPosture(msg.content, msg.affect_hint);

    // Step 4: Sovereignty Symmetry Check
    const sovereignty = checkSovereigntySymmetry(msg.content);

    // Step 5: Transfer — return full IBL result for pipeline integration
    return {
        captured:             true,
        state_acknowledged:   stateAck.acknowledged,
        state_summary:        stateAck.summary,
        posture,
        posture_confidence:   confidence,
        sovereignty_flag:     sovereignty.flag,
        sovereignty_note:     sovereignty.note,
        sequence_hint:        POSTURE_SEQUENCE_HINTS[posture],
        downstream_note:      POSTURE_DOWNSTREAM_NOTES[posture],
    };
}
