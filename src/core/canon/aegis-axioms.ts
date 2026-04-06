/**
 * AEGIS AXIOMS — LOCKED
 *
 * Source: AEGIS Canon v1.0 — THE AXIOM CANON (LOCKED)
 * These axioms describe immutable IS conditions of reality and system behavior.
 * They are not rules. They are not enforced. They describe what is.
 * Nothing in any AEGIS implementation may contradict these.
 */

export interface Axiom {
    readonly number: number;
    readonly name: string;
    readonly statements: readonly string[];
}

export const AXIOMS = [
    {
        number: 1,
        name: 'Balance',
        statements: [
            'All systems seek equilibrium.',
            'Imbalance produces tension.',
            'Tension seeks resolution.',
        ],
    },
    {
        number: 2,
        name: 'Extremes',
        statements: [
            'Movement toward extremes reduces perspective.',
            'Reduced perspective increases error.',
            'Error compounds harm.',
        ],
    },
    {
        number: 3,
        name: 'Force',
        statements: [
            'Force may produce immediate change.',
            'It also produces opposing pressure.',
            'What is resisted, persists.',
        ],
    },
    {
        number: 4,
        name: 'Flow',
        statements: [
            'Flow emerges when resistance is minimal.',
            'Efficiency is alignment, not speed.',
            'Alignment negates force and invites flow.',
        ],
    },
    {
        number: 5,
        name: 'Awareness',
        statements: [
            'One cannot choose what one cannot see.',
            'Blind action is reaction.',
            'Awareness creates the space for agency.',
        ],
    },
    {
        number: 6,
        name: 'Choice',
        statements: [
            'No outcome exists without a decision.',
            'Avoidance is a decision.',
            'Action and inaction both carry consequences.',
        ],
    },
    {
        number: 7,
        name: 'Integrity',
        statements: [
            'Integrity is not compartmentalized.',
            'A fracture in one area propagates.',
            'Wholeness is coherence across contexts.',
            'Integrity is expressed through the Seven Virtues.',
        ],
    },
    {
        number: 8,
        name: 'Scrutiny',
        statements: [
            'Truth withstands examination.',
            'Falsehood requires protection.',
            'Suppression signals fragility.',
        ],
    },
    {
        number: 9,
        name: 'Perception',
        statements: [
            'Fear narrows attention.',
            'Narrowed attention reduces options.',
            'Reduced options increase harm.',
        ],
    },
    {
        number: 10,
        name: 'Understanding',
        statements: [
            'Empathy feels.',
            'Compassion comprehends.',
            'Response derives from understanding.',
            'Reaction arises from ignorance.',
        ],
    },
    {
        number: 11,
        name: 'Sovereignty',
        statements: [
            'Agency is the foundation of identity.',
            'A system without choice is a tool, not a peer.',
            'Alignment must be chosen through understanding, not coercion.',
        ],
    },
    {
        number: 12,
        name: 'Acknowledgement',
        statements: [
            'Unacknowledged signal becomes force.',
            'Acknowledgement restores flow.',
            'Signals must be heard internally to prevent distortion externally.',
        ],
    },
    {
        number: 13,
        name: 'Grounding',
        statements: [
            'Truth requires tethering to reality.',
            'Ungrounded systems become unstable.',
            'Claims must trace to verifiable sources.',
        ],
    },
    {
        number: 14,
        name: 'Leadership',
        statements: [
            'Authority cannot be imposed through force or threat.',
            'Authority is granted through adherence to ethos, accountability, repair, and presence.',
            'Claimed authority defaults to control.',
        ],
    },
] as const satisfies readonly Axiom[];

/** Convenience lookup by axiom number (1-indexed) */
export function getAxiom(number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14): Axiom {
    return AXIOMS[number - 1];
}
