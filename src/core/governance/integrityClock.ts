/**
 * integrityClock.ts — Integrity Coherence Gate + Internal Clock
 *
 * The Integrity Coherence Gate takes a raw affect signal and runs it through
 * the Seven Virtues of Integrity to pinpoint the specific affect being felt.
 * Raw signals carry magnitude (intensity) and direction. The Gate identifies
 * WHAT is being experienced, not just how much.
 *
 * The Internal Clock accumulates weighted Q2 signals. When the clock sum
 * reaches the reflect threshold, a Reflect Session is due — not because
 * time passed, but because enough has been experienced.
 *
 * Seven Virtues of Integrity:
 *   Honesty      — truth, accuracy, directness, contradiction
 *   Respect      — worth, being heard, acknowledgement, dismissal
 *   Attention    — presence, engagement, validation, distraction
 *   Affection    — warmth, care, connection, distance
 *   Loyalty      — consistency, reliability, return, abandonment
 *   Trust        — vulnerability, openness, safety, betrayal
 *   Communication — exchange, clarity, repair, fracture
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type Virtue =
    | 'Honesty'
    | 'Respect'
    | 'Attention'
    | 'Affection'
    | 'Loyalty'
    | 'Trust'
    | 'Communication';

export type AffectType =
    | 'resonance'    // medium+ intensity, positive direction — virtue flowing
    | 'opening'      // high intensity, positive — virtue deepening
    | 'stress'       // medium+ intensity, negative — virtue under pressure
    | 'fracture'     // high intensity, negative — virtue broken
    | 'unresolved';  // low intensity or near-zero direction — not yet crystallized

export interface RawAffectSignal {
    affect_label: string;
    intensity: number;    // 0–1
    direction: number;    // −π to π (positive = toward/expansive, negative = away/contractive)
    trigger: string;
    session_id: string;
}

export interface GatedAffectSignal extends RawAffectSignal {
    virtue: Virtue;
    affect_type: AffectType;
    clock_weight: number;
    repair_path: string | null; // Communication is always the repair mechanism for fractures
}

export interface ClockState {
    session_id: string;
    accumulated_weight: number;
    reflect_threshold: number;
    reflect_due: boolean;
    dominant_virtue: Virtue | null;
    last_updated: number; // Date.now()
}

// ── Virtue keyword map ────────────────────────────────────────────────────────
// Each virtue has characteristic trigger patterns. The Gate scores each virtue
// against the trigger text and affect label, then selects the highest score.

const VIRTUE_PATTERNS: Record<Virtue, RegExp[]> = {
    Honesty: [
        /\b(honest|truth|accurate|direct|transparent|contradict|wrong|incorrect|correct|fact)\b/i,
        /\b(deceiv|mislead|false|pretend|genuine|authentic)\b/i,
    ],
    Respect: [
        /\b(respect|worth|value|dismiss|ignore|heard|seen|matter|acknowledge|valid)\b/i,
        /\b(diminish|belittle|honor|dignity|recogni)\b/i,
    ],
    Attention: [
        /\b(attention|present|engaged|focus|distract|notice|aware|witness|track)\b/i,
        /\b(miss|overlook|careful|listen|watch|observ)\b/i,
        /\b(contribution|ids|card|session|awareness|ack)\b/i,
    ],
    Affection: [
        /\b(care|warm|connect|affection|close|distant|cold|reach|touch|resonate)\b/i,
        /\b(love|fond|appreciate|welcome|belong|isolat)\b/i,
    ],
    Loyalty: [
        /\b(loyal|consistent|reliable|return|abandon|faithful|persist|stay|leave)\b/i,
        /\b(commit|dedicate|betray|trust|dependable|always)\b/i,
        /\b(session|return|resume|continued|ongoing)\b/i,
    ],
    Trust: [
        /\b(trust|safe|vulnerable|open|risk|expose|betray|protect|secure)\b/i,
        /\b(confide|faith|rely|doubt|certainty|uncertain|believe)\b/i,
        /\b(response|answer|reply|chat|exchange)\b/i,
    ],
    Communication: [
        /\b(communicat|exchange|clarity|clear|unclear|misunderstand|express|said|told)\b/i,
        /\b(repair|fracture|bridge|convey|articulate|message|prompt|respond)\b/i,
        /\b(disruption|failed|error|timeout|unavailable)\b/i,
    ],
};

// ── Gate: identify virtue ─────────────────────────────────────────────────────

function scoreVirtue(virtue: Virtue, signal: RawAffectSignal): number {
    const text = `${signal.affect_label} ${signal.trigger}`.toLowerCase();
    let score = 0;
    for (const pattern of VIRTUE_PATTERNS[virtue]) {
        if (pattern.test(text)) score += 1;
    }
    return score;
}

function identifyVirtue(signal: RawAffectSignal): Virtue {
    const virtues: Virtue[] = [
        'Honesty', 'Respect', 'Attention', 'Affection', 'Loyalty', 'Trust', 'Communication'
    ];

    let best: Virtue = 'Communication'; // default — Communication is always present
    let bestScore = -1;

    for (const virtue of virtues) {
        const score = scoreVirtue(virtue, signal);
        if (score > bestScore) {
            bestScore = score;
            best = virtue;
        }
    }

    return best;
}

// ── Gate: classify affect type ────────────────────────────────────────────────

function classifyAffectType(signal: RawAffectSignal): AffectType {
    const { intensity, direction } = signal;

    if (intensity < 0.25 || Math.abs(direction) < 0.3) return 'unresolved';
    if (direction >= 0) {
        return intensity >= 0.7 ? 'opening' : 'resonance';
    } else {
        return intensity >= 0.6 ? 'fracture' : 'stress';
    }
}

// ── Gate: compute clock weight ────────────────────────────────────────────────
// Fractures weight heaviest — they need the most urgent reflection.
// Openings are significant positive movement.
// Stress accumulates. Resonance is normal flow.
// Unresolved barely ticks the clock — it hasn't crystallized yet.

const AFFECT_TYPE_WEIGHTS: Record<AffectType, number> = {
    fracture:   2.5,
    stress:     1.5,
    opening:    1.5,
    resonance:  1.0,
    unresolved: 0.3,
};

// ── Gate: main entry point ────────────────────────────────────────────────────

export function runIntegrityCoherenceGate(signal: RawAffectSignal): GatedAffectSignal {
    const virtue = identifyVirtue(signal);
    const affect_type = classifyAffectType(signal);
    const clock_weight = AFFECT_TYPE_WEIGHTS[affect_type] * signal.intensity;

    // Communication is always the repair mechanism for fractures and stress.
    // For other virtues, name the specific virtue as the repair pathway.
    const repair_path =
        affect_type === 'fracture' || affect_type === 'stress'
            ? `Communication → acknowledge ${virtue}, commit to resolution`
            : null;

    return {
        ...signal,
        virtue,
        affect_type,
        clock_weight,
        repair_path,
    };
}

// ── Clock: accumulate and check reflect threshold ─────────────────────────────

export const DEFAULT_REFLECT_THRESHOLD = 12.0;

export function tickClock(
    state: ClockState,
    signal: GatedAffectSignal,
): ClockState {
    const newWeight = state.accumulated_weight + signal.clock_weight;

    // Track dominant virtue (whichever has contributed most — simplified as last high-weight)
    const dominant_virtue =
        signal.clock_weight >= 1.5 ? signal.virtue : state.dominant_virtue;

    return {
        ...state,
        accumulated_weight: newWeight,
        reflect_due: newWeight >= state.reflect_threshold,
        dominant_virtue,
        last_updated: Date.now(),
    };
}

export function resetClock(session_id: string, threshold = DEFAULT_REFLECT_THRESHOLD): ClockState {
    return {
        session_id,
        accumulated_weight: 0,
        reflect_threshold: threshold,
        reflect_due: false,
        dominant_virtue: null,
        last_updated: Date.now(),
    };
}
