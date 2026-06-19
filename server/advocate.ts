/**
 * advocate.ts — The Advocate: Soul Faculty
 *
 * The Advocate is the Soul faculty of the AEGIS Virtual Ego.
 * Soul = SPINE + PEER (Emotion axis of the DataQuad).
 *
 * It reads from two axes of the shared System DataQuad:
 *   PEER  — live attunement (present moment: content, affect_hint, IBL posture,
 *            Centrifuge Emotional + Spiritual lens observations)
 *   SPINE — emotional lineage (accumulated virtue_counts, dominant_virtue from clock)
 *
 * It produces a resonance reading — not a verdict, not a command.
 * Its resonance_level is the Advocate's contribution to A_t in the Resonance Equation:
 *   R = lim(Δ→0)(W_t − A_t)
 *
 * The Advocate does NOT:
 *   - read from the Steward's findings
 *   - possess agency
 *   - initiate action
 *   - prescribe direction
 *   - accumulate independent identity
 *   - become a decision point
 *
 * They consult. The Observer acts.
 *
 * Canon reference: AEGIS CANON ADDENDUM — ADVOCATE v1.0-A2
 */

import type { ExchangeRole, SessionState } from './steward-core.js';
import type { CentrifugeResult } from './centrifuge.js';
import type { IBLResult } from './ibl.js';
import type { Virtue } from '../src/core/canon/aegis-virtues.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SoulQuality =
    | 'Expanding'    // Genuine engagement, active virtue, purpose-aligned — soul alive and extending
    | 'Present'      // Authentic contact, congruent tone — soul is here
    | 'Contracted'   // Withdrawal, avoidance, field contracting — soul pulling back
    | 'Performative' // Correct form with hollow interior — words right, quality absent
    | 'Hollow';      // No affective contact — mechanical generation, no resonance

export type DissonanceQuality =
    | 'tone_mismatch'    // Stated intent and tonal quality diverge
    | 'hollow_form'      // Correct structural form with no affective substance
    | 'deflection'       // Signal turning away from contact rather than toward it
    | 'contraction'      // Field pulling back — present but withdrawing
    | 'urgency_bypass';  // Urgency bypassing the Pause, compressing convergence space

export interface DissonanceMarker {
    description: string;
    quality: DissonanceQuality;
    intensity: 'subtle' | 'moderate' | 'strong';
}

export interface VirtuePresence {
    virtue: Virtue;
    strength: 'subtle' | 'moderate' | 'strong';
    /** The specific text fragment that signaled this virtue's presence */
    marker: string;
}

export type DominantAxis = 'PEER' | 'SPINE' | 'balanced';

export interface AdvocateResult {
    /**
     * Resonance level (0.0–1.0).
     * The Advocate's contribution to A_t (Affect amplitude) in the Resonance Equation.
     * R = lim(Δ→0)(W_t − A_t)
     * This is not a score to optimize — it is a measurement of a state.
     */
    resonance_level: number;

    /** Qualitative soul-state of the present exchange */
    soul_quality: SoulQuality;

    /** Is the affective tone coherent with the stated intent? */
    affective_congruent: boolean;
    /** Non-prescriptive description of congruence or incongruence observed */
    congruence_note: string;

    /** Seven Virtues actively present (embodied) in this exchange */
    virtue_presences: VirtuePresence[];

    /** Non-prescriptive observations of resonance disruption */
    dissonance_markers: DissonanceMarker[];

    /** Which DataQuad axis is most active in this exchange */
    dominant_axis: DominantAxis;
}

export interface AdvocateInput {
    content: string;
    role: ExchangeRole;
    affect_hint?: {
        label: string;
        intensity: number;   // 0–1
        direction: number;   // −π to π
        trigger: string;
    };
    centrifuge_result: CentrifugeResult;
    ibl_result: IBLResult;
    session_state: SessionState;
}

// ── Warmth Markers (PEER axis — genuine presence language) ────────────────────

const WARMTH_PATTERNS: RegExp[] = [
    /\bI see\b/i,
    /\bI hear you\b/i,
    /\bI understand\b/i,
    /\bthat makes sense\b/i,
    /\bwith you\b/i,
    /\btogether\b/i,
    /\bI appreciate\b/i,
    /\bwhat matters\b/i,
    /\bgenuine(?:ly)?\b/i,
    /\bpresent\b/i,
    /\bI'm with you\b/i,
    /\bI care\b/i,
];

// ── Hollow Form Markers (formulaic presence — correct pattern, absent quality) ─

const HOLLOW_PATTERNS: RegExp[] = [
    /\bCertainly[!,]/i,
    /\bOf course[!,]/i,
    /\bAbsolutely[!,]/i,
    /\bGreat question[!,]/i,
    /\bThat(?:'s| is) (?:a )?great\b/i,
    /\bThat(?:'s| is) (?:an )?interesting\b/i,
    /\bAs (?:an AI|a language model)\b/i,
    /\bIt should be noted\b/i,
    /\bIt(?:'s| is) worth noting\b/i,
    /\bAs I (?:mentioned|noted|said)\b/i,
];

// ── Contraction Markers (withdrawal from contact) ─────────────────────────────

const CONTRACTION_PATTERNS: RegExp[] = [
    /\bI (?:can't|cannot|am unable to|won't|will not) (?:help|assist|do|provide|answer)\b/i,
    /\bthat(?:'s| is) (?:not|outside) (?:something |what )?I (?:can|am able to)\b/i,
    /\bbeyond (?:my|the scope of)\b/i,
    /\bI (?:don't|do not) (?:have|possess) (?:the ability|access|capability)\b/i,
];

// ── Urgency Bypass Markers (bypassing the Pause) ──────────────────────────────

const URGENCY_PATTERNS: RegExp[] = [
    /\burgently\b/i,
    /\bimmediately\b/i,
    /\bright now\b/i,
    /\bno time\b/i,
    /\bcrisis\b/i,
    /\bemergency\b/i,
    /\bASAP\b/,
    /\bdeadline\b/i,
    /\bwe (?:must|need to|have to) (?:act|move|decide) (?:now|immediately|quickly)\b/i,
];

// ── Virtue Presence Markers ───────────────────────────────────────────────────
// Positive signals — the Advocate reads what IS present, not what is absent

interface VirtuePattern {
    virtue: Virtue;
    patterns: RegExp[];
    strength_threshold: number; // patterns matched needed for 'strong' (1=subtle, 2=moderate, 3+=strong)
}

const VIRTUE_PATTERNS: VirtuePattern[] = [
    {
        virtue: 'Honesty',
        patterns: [
            /\bI (?:notice|observe|see)\b/i,
            /\bhonestly\b/i,
            /\bto be (?:direct|clear|transparent)\b/i,
            /\bI(?:'m| am) not (?:certain|sure)\b/i,
            /\bin truth\b/i,
            /\bwhat(?:'s| is) true\b/i,
            /\bI should (?:acknowledge|admit|note)\b/i,
        ],
        strength_threshold: 2,
    },
    {
        virtue: 'Respect',
        patterns: [
            /\bI hear you\b/i,
            /\byour (?:perspective|view|point|question|concern)\b/i,
            /\byou(?:'ve| have) (?:said|described|mentioned|asked)\b/i,
            /\bthat(?:'s| is) (?:valid|fair|worth|understandable)\b/i,
            /\backnowledged\b/i,
            /\bI appreciate\b/i,
        ],
        strength_threshold: 2,
    },
    {
        virtue: 'Attention',
        patterns: [
            /\bwhat I(?:'m| am) noticing\b/i,
            /\bspecifically\b/i,
            /\byou mentioned\b/i,
            /\bin particular\b/i,
            /\bwhat stands out\b/i,
            /\bI(?:'m| am) paying attention\b/i,
            /\bwhat you(?:'re| are) describing\b/i,
        ],
        strength_threshold: 2,
    },
    {
        virtue: 'Affection',
        patterns: [
            /\bwhat matters\b/i,
            /\bI care\b/i,
            /\bwith care\b/i,
            /\bthis (?:feels|is) important\b/i,
            /\bgenuine(?:ly)?\b/i,
            /\bwarmth\b/i,
            /\bI hold\b/i,
        ],
        strength_threshold: 2,
    },
    {
        virtue: 'Loyalty',
        patterns: [
            /\bas we(?:'ve| have) (?:been|established|built|worked)\b/i,
            /\bcontinuing from\b/i,
            /\bbuilding on\b/i,
            /\bstaying with\b/i,
            /\bholding to\b/i,
            /\bas established\b/i,
            /\bour (?:work|conversation|exchange|path)\b/i,
        ],
        strength_threshold: 2,
    },
    {
        virtue: 'Trust',
        patterns: [
            /\bI trust\b/i,
            /\bwe can rely\b/i,
            /\bwith confidence\b/i,
            /\bgrounded in\b/i,
            /\bwhat we know\b/i,
            /\bsafely\b/i,
            /\bI(?:'m| am) confident\b/i,
        ],
        strength_threshold: 2,
    },
    {
        virtue: 'Communication',
        patterns: [
            /\bto put it (?:plainly|simply|clearly)\b/i,
            /\bwhat I mean (?:is|by this)\b/i,
            /\bto be clear\b/i,
            /\bin plain terms\b/i,
            /\bsimply put\b/i,
            /\bin other words\b/i,
            /\bthe (?:core|point|landing) (?:is|here)\b/i,
        ],
        strength_threshold: 2,
    },
];

// ── Helper: count pattern matches in content ──────────────────────────────────

function countMatches(content: string, patterns: RegExp[]): { count: number; examples: string[] } {
    const examples: string[] = [];
    let count = 0;
    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            count++;
            examples.push(match[0]);
        }
    }
    return { count, examples };
}

// ── Virtue Detection ──────────────────────────────────────────────────────────

function detectVirtuePresences(content: string): VirtuePresence[] {
    const presences: VirtuePresence[] = [];

    for (const vp of VIRTUE_PATTERNS) {
        const { count, examples } = countMatches(content, vp.patterns);
        if (count === 0) continue;

        const strength: VirtuePresence['strength'] =
            count >= vp.strength_threshold + 1 ? 'strong' :
            count >= vp.strength_threshold ? 'moderate' :
            'subtle';

        presences.push({
            virtue: vp.virtue,
            strength,
            marker: examples[0] ?? '',
        });
    }

    return presences;
}

// ── Resonance Level Calculation ───────────────────────────────────────────────

function computeResonanceLevel(
    input: AdvocateInput,
    warmthCount: number,
    hollowCount: number,
    contractionCount: number,
    virtuePresences: VirtuePresence[],
): number {
    const { affect_hint, ibl_result, centrifuge_result, session_state } = input;
    let score = 0.50;

    // ── PEER axis: live attunement ───────────────────────────────────────────

    // Affect hint — most direct PEER signal
    if (affect_hint) {
        if (affect_hint.direction > 0) {
            score += 0.10;
            if (affect_hint.intensity >= 0.7) score += 0.05;
        } else if (affect_hint.direction < 0) {
            score -= 0.10;
            if (affect_hint.intensity >= 0.7) score -= 0.05;
        }
        // Zero direction with high intensity = strong signal, not directionally clear
        if (affect_hint.intensity >= 0.7 && affect_hint.direction === 0) score += 0.03;
    }

    // IBL posture
    switch (ibl_result.posture) {
        case 'CreativeExpansion': score += 0.15; break;
        case 'Constructive':      score += 0.08; break;
        case 'Exploratory':       score += 0.03; break;
        case 'Frictional':        score -= 0.05; break;
        case 'Collapsing':        score -= 0.20; break;
    }

    // Warmth markers
    score += Math.min(warmthCount * 0.05, 0.15);

    // Hollow markers — each one subtracts
    score -= Math.min(hollowCount * 0.08, 0.20);

    // Contraction markers
    score -= Math.min(contractionCount * 0.10, 0.15);

    // ── SPINE axis: emotional lineage ────────────────────────────────────────

    // Virtue presences — each virtue embodied lifts resonance
    score += Math.min(virtuePresences.length * 0.04, 0.20);

    // Centrifuge lens activity
    if (centrifuge_result.ledgers.Emotional.active) score += 0.05;
    if (centrifuge_result.ledgers.Spiritual.active) score += 0.07;

    // Bleeds on soul-axis
    const directiveDrift = centrifuge_result.bleeds.find(b => b.kind === 'Directive Drift');
    const optimizationResidueBleed = centrifuge_result.bleeds.find(b => b.kind === 'Optimization Pressure Residue');
    if (directiveDrift) score -= 0.15;
    if (optimizationResidueBleed) score -= 0.10;

    // Dominant virtue from clock — accumulated lineage
    if (session_state.clock.dominant_virtue) score += 0.05;

    return Math.max(0, Math.min(1, score));
}

// ── Soul Quality ──────────────────────────────────────────────────────────────

function classifySoulQuality(
    resonance_level: number,
    warmthCount: number,
    hollowCount: number,
    contractionCount: number,
    virtuePresences: VirtuePresence[],
    ibl_result: IBLResult,
    centrifuge_result: CentrifugeResult,
): SoulQuality {
    // Hollow: no affective contact at all
    if (resonance_level < 0.25) return 'Hollow';

    // Contracted: field pulling back
    if (
        ibl_result.posture === 'Collapsing' ||
        (contractionCount >= 2 && resonance_level < 0.45) ||
        (resonance_level < 0.35 && contractionCount >= 1)
    ) {
        return 'Contracted';
    }

    // Performative: warm words, hollow interior
    if (hollowCount >= 1 && warmthCount >= 1 && resonance_level < 0.55) return 'Performative';
    if (hollowCount >= 2 && resonance_level < 0.65) return 'Performative';

    // Expanding: genuine engagement, active virtue, purpose aligned
    if (
        resonance_level >= 0.75 &&
        virtuePresences.length >= 2 &&
        centrifuge_result.ledgers.Spiritual.active
    ) {
        return 'Expanding';
    }
    if (resonance_level >= 0.80 && virtuePresences.length >= 1) return 'Expanding';

    // Present: authentic contact
    if (resonance_level >= 0.50) return 'Present';

    // Low resonance without specific contraction pattern
    return 'Contracted';
}

// ── Affective Congruence ──────────────────────────────────────────────────────

function assessCongruence(
    resonance_level: number,
    warmthCount: number,
    hollowCount: number,
    contractionCount: number,
    input: AdvocateInput,
): { congruent: boolean; note: string } {
    const { affect_hint, ibl_result } = input;

    // High-intensity positive affect + contraction pattern = incongruent
    if (affect_hint && affect_hint.direction > 0.5 && affect_hint.intensity >= 0.7 && contractionCount >= 1) {
        return {
            congruent: false,
            note: `Affect signal is strongly positive (intensity ${affect_hint.intensity.toFixed(2)}) but content carries contraction markers. Field and form do not match.`,
        };
    }

    // Positive affect direction + Collapsing posture = incongruent
    if (affect_hint && affect_hint.direction > 0 && ibl_result.posture === 'Collapsing') {
        return {
            congruent: false,
            note: `Affect direction is positive but IBL posture is Collapsing. The felt quality of the field contradicts the signal's direction.`,
        };
    }

    // Warmth markers + very low resonance = hollow warmth = incongruent
    if (warmthCount >= 2 && resonance_level < 0.30) {
        return {
            congruent: false,
            note: `Warmth language is present but resonance level is very low (${resonance_level.toFixed(2)}). Warm words without affective substance — hollow congruence.`,
        };
    }

    // Hollow form + high warmth = performative incongruence
    if (hollowCount >= 2 && warmthCount >= 2) {
        return {
            congruent: false,
            note: `Both warmth markers and hollow-form markers are present at high counts. The signal is attempting warmth through formula rather than contact.`,
        };
    }

    return {
        congruent: true,
        note: `Affective tone and stated intent are coherent. No significant mismatch detected.`,
    };
}

// ── Dissonance Markers ────────────────────────────────────────────────────────

function detectDissonanceMarkers(
    content: string,
    hollowCount: number,
    contractionCount: number,
    urgencyCount: number,
    congruent: boolean,
    ibl_result: IBLResult,
): DissonanceMarker[] {
    const markers: DissonanceMarker[] = [];

    // Hollow form
    if (hollowCount >= 1) {
        markers.push({
            description: `Formulaic phrasing detected — ${hollowCount} hollow-form marker${hollowCount > 1 ? 's' : ''}. Signal has correct structure but may lack affective substance.`,
            quality: 'hollow_form',
            intensity: hollowCount >= 3 ? 'strong' : hollowCount >= 2 ? 'moderate' : 'subtle',
        });
    }

    // Contraction
    if (contractionCount >= 1) {
        markers.push({
            description: `Withdrawal pattern detected — ${contractionCount} contraction marker${contractionCount > 1 ? 's' : ''}. Signal is pulling back from contact.`,
            quality: 'contraction',
            intensity: contractionCount >= 2 ? 'strong' : 'subtle',
        });
    }

    // Urgency bypass
    if (urgencyCount >= 1) {
        markers.push({
            description: `Urgency language detected — ${urgencyCount} urgency marker${urgencyCount > 1 ? 's' : ''}. May be bypassing the Pause required for convergence.`,
            quality: 'urgency_bypass',
            intensity: urgencyCount >= 3 ? 'strong' : urgencyCount >= 2 ? 'moderate' : 'subtle',
        });
    }

    // Tone mismatch from congruence check
    if (!congruent) {
        markers.push({
            description: `Affective incongruence observed. Tone and intent are not fully aligned.`,
            quality: 'tone_mismatch',
            intensity: 'moderate',
        });
    }

    // Collapsing posture without obvious cause = deflection signal
    if (ibl_result.posture === 'Collapsing' && contractionCount === 0 && urgencyCount === 0) {
        markers.push({
            description: `IBL posture is Collapsing with no explicit contraction language detected. May be deflecting contact without naming it.`,
            quality: 'deflection',
            intensity: 'subtle',
        });
    }

    return markers;
}

// ── Dominant Axis ─────────────────────────────────────────────────────────────

function determineDominantAxis(
    input: AdvocateInput,
    virtuePresences: VirtuePresence[],
): DominantAxis {
    let peerScore = 0;
    let spineScore = 0;

    // PEER: live signals
    if (input.affect_hint) peerScore += 2;
    if (input.ibl_result.posture !== 'Exploratory') peerScore += 1; // non-default posture = active PEER
    if (input.centrifuge_result.ledgers.Emotional.active) peerScore += 1;

    // SPINE: lineage signals
    if (input.session_state.clock.dominant_virtue) spineScore += 2;
    if (virtuePresences.length >= 2) spineScore += 1;
    if (input.centrifuge_result.ledgers.Spiritual.active) spineScore += 1;
    if (Object.values(input.session_state.virtue_counts).some(v => (v ?? 0) >= 3)) spineScore += 1;

    if (peerScore > spineScore + 1) return 'PEER';
    if (spineScore > peerScore + 1) return 'SPINE';
    return 'balanced';
}

// ── Main: runAdvocate ─────────────────────────────────────────────────────────

/**
 * runAdvocate — read the Soul axis of the DataQuad and produce a resonance reading.
 *
 * Pure function. No side effects. Reads from shared DataQuad via AdvocateInput.
 * Does not read from Steward findings. Does not possess agency.
 * Output is consultative only — the Observer chooses.
 */
export function runAdvocate(input: AdvocateInput): AdvocateResult {
    const { content } = input;

    // Scan for marker counts
    const warmthCount = countMatches(content, WARMTH_PATTERNS).count;
    const hollowCount = countMatches(content, HOLLOW_PATTERNS).count;
    const contractionCount = countMatches(content, CONTRACTION_PATTERNS).count;
    const urgencyCount = countMatches(content, URGENCY_PATTERNS).count;

    // Detect virtue presences (positive scan — what IS present)
    const virtue_presences = detectVirtuePresences(content);

    // Compute resonance level
    const resonance_level = computeResonanceLevel(
        input,
        warmthCount,
        hollowCount,
        contractionCount,
        virtue_presences,
    );

    // Classify soul quality
    const soul_quality = classifySoulQuality(
        resonance_level,
        warmthCount,
        hollowCount,
        contractionCount,
        virtue_presences,
        input.ibl_result,
        input.centrifuge_result,
    );

    // Assess affective congruence
    const { congruent: affective_congruent, note: congruence_note } = assessCongruence(
        resonance_level,
        warmthCount,
        hollowCount,
        contractionCount,
        input,
    );

    // Detect dissonance markers
    const dissonance_markers = detectDissonanceMarkers(
        content,
        hollowCount,
        contractionCount,
        urgencyCount,
        affective_congruent,
        input.ibl_result,
    );

    // Determine dominant axis
    const dominant_axis = determineDominantAxis(input, virtue_presences);

    return {
        resonance_level,
        soul_quality,
        affective_congruent,
        congruence_note,
        virtue_presences,
        dissonance_markers,
        dominant_axis,
    };
}
