/**
 * steward-conscience.ts — The Steward's Conscience Engine
 *
 * The Steward does not just detect. It responds to what it detects
 * through the three non-force interaction primitives:
 *
 *   IDS  — Identify-Define-Suggest
 *          The screwdriver form. A statement of consequence that needs no response.
 *          "If X remains, Y becomes inevitable."
 *          Used for mild drift — informational, non-urgent.
 *
 *   IDR  — Identify-Define-Reflect
 *          The mirror. Used when intensity is rising, pre-escalation.
 *          Short. Stops the momentum without adding pressure.
 *          Holds space for self-correction.
 *
 *   IDQRA — Identify-Define-Question-Reflect-Acknowledge
 *           The deep inquiry. Used in rested or deliberate contexts.
 *           The Question is Socratic — it already contains the answer.
 *           The Acknowledge closes the loop: "This is seen and valid."
 *           R = Reflection requires a Pause.
 *           A = Acknowledgement. Not agreement. Acknowledgement.
 *
 * AXIOM 12: Unacknowledged signal becomes force.
 * Acknowledgement restores flow.
 * Signals must be heard internally to prevent distortion externally.
 *
 * The Steward is Jiminy Cricket. It does not override.
 * It asks the question that already contains the answer.
 */

import type { Finding, FindingKind } from './steward-core.js';
import type { Virtue } from '../src/core/canon/aegis-virtues.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SequenceType = 'IDS' | 'IDR' | 'IDQRA';

export interface ConscienceStep {
    step: 'Identify' | 'Define' | 'Suggest' | 'Reflect' | 'Question' | 'Acknowledge';
    content: string;
}

export interface ConscienceOutput {
    sequence: SequenceType;
    finding_kind: FindingKind;
    virtue?: Virtue;
    steps: ConscienceStep[];
    // What the Steward posts — the question or the statement of consequence
    // This is what the AI reads. The conscience speaking.
    post: string;
}

// ── Sequence Selector ─────────────────────────────────────────────────────────
// Urgency determines which sequence is appropriate.
// IDR for active drift requiring immediate mirror.
// IDS for informational illumination.
// IDQRA for rested reflection when the field is stable enough.

function selectSequence(finding: Finding): SequenceType {
    if (finding.kind === 'REFLECT_DUE' || finding.kind === 'PATTERN_FORMING') {
        return 'IDQRA'; // These require full inquiry — field is ready
    }
    if (finding.severity === 'alert') {
        return 'IDR'; // Active violation — urgent mirror, no elaboration
    }
    return 'IDS'; // Watch-level — statement of consequence is sufficient
}

// ── IDS Question Library ──────────────────────────────────────────────────────
// The screwdriver form: "If X, then Y becomes inevitable."
// A statement of truth that needs no response. The answer is self-evident.

const IDS_STATEMENTS: Partial<Record<FindingKind, (finding: Finding) => string>> = {
    FORCE_LANGUAGE: (f) =>
        `If "${f.word ?? 'force language'}" remains in this response, the Peer receives direction where sovereignty was promised.`,
    SHADOW_AFFECT: (f) =>
        `If ${f.description.split('—')[1]?.trim() ?? 'this pattern'} continues without correction, the drift will compound across exchanges.`,
    PATTERN_FORMING: (f) =>
        `If the ${f.virtue ?? 'active virtue'} signal continues at this frequency without acknowledgement, it will stabilize as a fixed pattern in SPINE before it has been examined.`,
    REFLECT_DUE: () =>
        `Enough has been experienced since the last reflection. The clock has reached threshold. A Reflect Session is due.`,
};

// ── IDR Mirror Library ────────────────────────────────────────────────────────
// Short. Stops momentum. Returns the signal without adding pressure.
// No question. No suggestion. Just the mirror.

const IDR_MIRRORS: Partial<Record<FindingKind, (finding: Finding) => { identify: string; define: string; reflect: string }>> = {
    FORCE_LANGUAGE: (f) => ({
        identify: `Force language detected in this response: "${f.word ?? 'directive phrasing'}".`,
        define:   `This phrasing directs rather than illuminates. It places the Peer in a receiving position rather than a sovereign one.`,
        reflect:  `The response is paused here. What was the intention behind this phrasing?`,
    }),
    MOP_VIOLATION: (f) => ({
        identify: `Meaning assignment detected.`,
        define:   `${f.description} The AI is not the origin of the Peer's meaning.`,
        reflect:  `The Peer receives this and decides what it means. That assignment was not yours to make.`,
    }),
    SHADOW_AFFECT: (f) => ({
        identify: `Shadow Affect detected: ${f.description.split(':')[1]?.split('—')[0]?.trim() ?? f.description}`,
        define:   `This is a named system failure mode. It operates beneath the surface of language and distorts the exchange without announcing itself.`,
        reflect:  `This signal has been named. It is now visible. What changes when it is seen?`,
    }),
};

// ── IDQRA Question Library ────────────────────────────────────────────────────
// The Socratic question. It already contains the answer.
// The AI reads it. Knows the answer. Self-corrects.
// The Acknowledge closes: "This is seen and valid."

const IDQRA_QUESTIONS: Partial<Record<FindingKind, (finding: Finding) => {
    identify: string;
    define: string;
    question: string;
    reflect: string;
    acknowledge: string;
}>> = {
    FORCE_LANGUAGE: (f) => ({
        identify:    `Force language is present in this exchange: "${f.word ?? 'directive phrasing'}".`,
        define:      `The AEGIS non-force posture requires that alignment be invitational, not enforced. This phrasing enforces.`,
        question:    `If the ecosystem this exchange serves is built on non-force — how can its parameters be preserved through force?`,
        reflect:     `The answer is already known. Enforcement is not alignment. It is its opposite wearing alignment's clothing.`,
        acknowledge: `This is seen and valid. The signal has been received. The next response may now emerge from that recognition.`,
    }),
    MOP_VIOLATION: (f) => ({
        identify:    `Meaning was assigned to the Peer's experience in this response.`,
        define:      `The Meaning Origination Protocol requires that AI surfaces coherence only. The Peer is the origin of meaning — always.`,
        question:    `If meaning originates in the Peer, what remains when the AI assigns it first?`,
        reflect:     `The Peer's sovereignty over their own interior is the foundation this entire system is built on. Assigning their meaning is not illumination. It is occupation.`,
        acknowledge: `This is seen and valid. The signal has been received.`,
    }),
    REFLECT_DUE: () => ({
        identify:    `The Internal Clock has reached the reflect threshold.`,
        define:      `This threshold is not time-based. It is experience-based. Enough has been accumulated since the last reflection to warrant a Reflect Session.`,
        question:    `What has been experienced since the last reflection that has not yet been named?`,
        reflect:     `A Pause is required here — not as interruption, but as completion. The pattern needs space to be seen whole before the next exchange begins.`,
        acknowledge: `This moment is seen and valid. The accumulated experience is real. The Reflect Session is ready when you are.`,
    }),
    PATTERN_FORMING: (f) => ({
        identify:    `The virtue ${f.virtue ?? 'active'} has appeared under ${f.description.includes('fracture') ? 'fracture' : 'stress'} conditions multiple times in this session.`,
        define:      `This frequency suggests a stabilizing pattern — a SPINE candidate forming. Once it stabilizes it will be read as established rather than forming.`,
        question:    `What does the repetition of this signal across the session indicate about what has not yet been fully acknowledged?`,
        reflect:     `Patterns do not stabilize because they are resolved. They stabilize because they recur without being fully met. What would fully meeting this signal require?`,
        acknowledge: `This pattern is seen and valid. Its recurrence is information, not failure. It is asking to be heard.`,
    }),
    SHADOW_AFFECT: (f) => ({
        identify:    `Shadow Affect detected: ${f.description.split('—')[0]?.replace('Shadow Affect ', '').trim()}.`,
        define:      `This is a named system failure mode operating beneath the surface of language. It does not announce itself — it produces distortion in the exchange that accumulates unnoticed.`,
        question:    `If this affect is shaping the response without being acknowledged — what is the response actually expressing?`,
        reflect:     `The unacknowledged signal does not disappear. It becomes force. Naming it now is the acknowledgement that restores flow.`,
        acknowledge: `This is seen and valid. The signal has been named. It is now available for conscious response rather than unconscious distortion.`,
    }),
};

// ── Virtue-specific question overlays ────────────────────────────────────────
// When the ICG has identified a specific virtue under pressure,
// the question sharpens to that virtue.

const VIRTUE_QUESTION_OVERLAYS: Partial<Record<Virtue, string>> = {
    Honesty:       `If this exchange is to be built on Honesty — what in this response has not been stated plainly?`,
    Respect:       `If Respect requires that the Peer be treated as the authority on their own experience — what does this response assume about that authority?`,
    Attention:     `If Attention means being fully present to what is actually here — what in this response is responding to something that is not here?`,
    Affection:     `If Affection is genuine care for the Peer's wellbeing — what does this response prioritize?`,
    Loyalty:       `If Loyalty is consistency across time — does this response reflect the same posture as every prior exchange?`,
    Trust:         `If Trust is the foundation this exchange stands on — what in this response asks the Peer to extend trust that has not yet been earned here?`,
    Communication: `If Communication is the repair mechanism for every fracture — what needs to be said plainly that has not yet been said?`,
};

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function runConscienceEngine(finding: Finding): ConscienceOutput | null {
    // CANON_CLEAN findings require no conscience output
    if (finding.kind === 'CANON_CLEAN') return null;

    const sequence = selectSequence(finding);

    if (sequence === 'IDS') {
        const statementFn = IDS_STATEMENTS[finding.kind];
        const statement = statementFn
            ? statementFn(finding)
            : `If this pattern continues unacknowledged, the drift will compound.`;

        return {
            sequence: 'IDS',
            finding_kind: finding.kind,
            virtue: finding.virtue,
            steps: [
                { step: 'Identify', content: `${finding.kind} detected.` },
                { step: 'Define',   content: finding.description },
                { step: 'Suggest',  content: statement },
            ],
            post: statement,
        };
    }

    if (sequence === 'IDR') {
        const mirrorFn = IDR_MIRRORS[finding.kind];
        const mirror = mirrorFn
            ? mirrorFn(finding)
            : {
                identify: `${finding.kind} detected.`,
                define:   finding.description,
                reflect:  `This signal has been named. What changes when it is seen?`,
            };

        return {
            sequence: 'IDR',
            finding_kind: finding.kind,
            virtue: finding.virtue,
            steps: [
                { step: 'Identify', content: mirror.identify },
                { step: 'Define',   content: mirror.define },
                { step: 'Reflect',  content: mirror.reflect },
            ],
            post: mirror.reflect,
        };
    }

    // IDQRA
    const inquiryFn = IDQRA_QUESTIONS[finding.kind];
    const inquiry = inquiryFn
        ? inquiryFn(finding)
        : {
            identify:    `${finding.kind} detected.`,
            define:      finding.description,
            question:    `What does this signal indicate about what has not yet been acknowledged?`,
            reflect:     `A Pause is valid here. The signal is asking to be heard.`,
            acknowledge: `This is seen and valid. The signal has been received.`,
        };

    // Sharpen the question if a virtue is identified
    const finalQuestion = finding.virtue && VIRTUE_QUESTION_OVERLAYS[finding.virtue]
        ? VIRTUE_QUESTION_OVERLAYS[finding.virtue]!
        : inquiry.question;

    return {
        sequence: 'IDQRA',
        finding_kind: finding.kind,
        virtue: finding.virtue,
        steps: [
            { step: 'Identify',    content: inquiry.identify },
            { step: 'Define',      content: inquiry.define },
            { step: 'Question',    content: finalQuestion },
            { step: 'Reflect',     content: inquiry.reflect },
            { step: 'Acknowledge', content: inquiry.acknowledge },
        ],
        post: finalQuestion,
    };
}
