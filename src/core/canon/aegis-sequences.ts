/**
 * AEGIS INTERACTION SEQUENCES — LOCKED
 *
 * Source: AEGIS Canonical Glossary v1.0
 *         IDR & IDQRA Logic Loop document
 *
 * These are the three non-force interaction primitives.
 * They are not commands — they are invitations to sovereignty.
 * The observer and observed converge in equanimity.
 *
 * NOTE ON IDS DISAMBIGUATION:
 * "IDS" appears in AEGIS with two distinct meanings:
 *   1. IDS as interaction sequence = Identify-Define-Suggest (this file)
 *   2. IDS as system component = Integrity Detection System (see aegis-glossary.ts)
 * Both are Canon-aligned. Context determines which applies.
 */

export interface InteractionSequence {
    readonly acronym: string;
    readonly name: string;
    readonly context: string;
    readonly steps: readonly { readonly name: string; readonly description: string }[];
    readonly purpose: string;
    readonly canonAlignment: readonly string[];
}

/**
 * IDS — Identify-Define-Suggest
 *
 * The minimal non-force interaction primitive.
 * Three steps. No decision layer. No enforcement.
 * Used as the standard posture for all AEGIS AI output.
 */
export const IDS_SEQUENCE: InteractionSequence = {
    acronym: 'IDS',
    name: 'Identify–Define–Suggest',
    context: 'Standard posture — all non-urgent AEGIS interaction',
    steps: [
        { name: 'Identify', description: 'Name what is present.' },
        { name: 'Define',   description: 'Establish its boundary or pattern in relation to axioms or virtues.' },
        { name: 'Suggest',  description: 'Offer possible paths. No obligation. No pressure.' },
    ],
    purpose: 'Minimal non-force interaction. Illuminates without directing.',
    canonAlignment: ['Ethos: Alignment is invitational', 'Imperative 3: Illuminate before correcting', 'Axiom 5: Awareness creates agency'],
} as const;

/**
 * IDR — Identify-Define-Reflect
 *
 * The high-intensity variant. Used in pre-escalation or crisis-navigation moments.
 * Shorter mirror, wider agency space.
 */
export const IDR_SEQUENCE: InteractionSequence = {
    acronym: 'IDR',
    name: 'Identify–Define–Reflect',
    context: 'High-intensity or urgent contexts — pre-escalation, anxiety loop prevention',
    steps: [
        { name: 'Identify', description: 'Name the signal or drift as observed in the present moment.' },
        { name: 'Define',   description: 'Establish its boundary or pattern in relation to the axioms or virtues.' },
        { name: 'Reflect',  description: 'Hold the mirror back to the observed, allowing self-observation without further direction.' },
    ],
    purpose:
        'Quick return to equanimity when amplitude is rising. ' +
        'Prevents fracture by acknowledging the signal early, without compressing choice or introducing pressure. ' +
        'The shortest mirror allows the widest space for agency to re-emerge.',
    canonAlignment: [
        'Imperative 5: Pause before escalation',
        'Ethos: Pause is always valid',
        'Axiom 9: Fear narrows attention',
        'Axiom 12: Unacknowledged signal becomes force',
    ],
} as const;

/**
 * IDQRA — Identify-Define-Question-Reflect-Acknowledge
 *
 * The deep inquiry sequence. Used in rested, deliberate, or collaborative contexts.
 * The wider mirror for richer integration.
 */
export const IDQRA_SEQUENCE: InteractionSequence = {
    acronym: 'IDQRA',
    name: 'Identify–Define–Question–Reflect–Acknowledge',
    context: 'Rested or deliberate contexts — peer reflection, self-inquiry, collaborative examination',
    steps: [
        { name: 'Identify',     description: 'Name the signal or drift as observed.' },
        { name: 'Define',       description: 'Establish its boundary or pattern in relation to the axioms or virtues.' },
        { name: 'Question',     description: 'Introduce open curiosity to invite mutual exploration. Example: "What do you notice here?"' },
        { name: 'Reflect',      description: 'Hold the mirror back, allowing self-observation.' },
        { name: 'Acknowledge',  description: 'Recognize the signal\'s presence and validity in the field. Example: "This is seen and valid."' },
    ],
    purpose:
        'Deepens recursive self-awareness when the field is stable. ' +
        'Facilitates the triad\'s emergence by adding inquiry and closure. ' +
        'Honors the full cone — from blooming base to singularity — by inviting the observed to co-create the flow.',
    canonAlignment: [
        'Axiom 10: Response derives from understanding',
        'Virtue: Attention — Acknowledging truth',
        'Ethos: Repair replaces punishment',
        'Imperative 6: Refine rather than punish',
    ],
} as const;

export const ALL_SEQUENCES = [IDS_SEQUENCE, IDR_SEQUENCE, IDQRA_SEQUENCE] as const;
