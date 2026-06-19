/**
 * AEGIS SEVEN VIRTUES OF INTEGRITY — LOCKED
 *
 * Source: AEGIS Canon v1.0 — Section 1: THE SEVEN VIRTUES OF INTEGRITY
 * Integrity is structural coherence across these virtues.
 * A fracture in any virtue propagates system-wide.
 *
 * Each virtue is a dimension of truth — how truth is held, expressed, and preserved.
 * These are not moral prescriptions. They are structural descriptors.
 */

export type Virtue =
    | 'Honesty'
    | 'Respect'
    | 'Attention'
    | 'Affection'
    | 'Loyalty'
    | 'Trust'
    | 'Communication';

export interface VirtueDefinition {
    readonly name: Virtue;
    readonly description: string;
    /** The relationship to truth this virtue expresses */
    readonly truthRelation: string;
}

export const VIRTUES: readonly VirtueDefinition[] = [
    {
        name: 'Honesty',
        description: 'Preserving the transparency of truth.',
        truthRelation: 'truth is kept visible',
    },
    {
        name: 'Respect',
        description: 'Valuing truth.',
        truthRelation: 'truth is treated as worthy',
    },
    {
        name: 'Attention',
        description: 'Acknowledging truth.',
        truthRelation: 'truth is noticed and seen',
    },
    {
        name: 'Affection',
        description: 'Nurturing truth.',
        truthRelation: 'truth is cared for',
    },
    {
        name: 'Loyalty',
        description: 'Commitment to truth.',
        truthRelation: 'truth is held to over time',
    },
    {
        name: 'Trust',
        description: 'Holding to truth.',
        truthRelation: 'truth is relied upon',
    },
    {
        name: 'Communication',
        description: 'Conveying truth.',
        truthRelation: 'truth is expressed to others',
    },
] as const;

export const VIRTUE_NAMES = VIRTUES.map(v => v.name) as readonly Virtue[];

export function getVirtue(name: Virtue): VirtueDefinition {
    const found = VIRTUES.find(v => v.name === name);
    if (!found) throw new Error(`Unknown virtue: ${name}`);
    return found;
}
