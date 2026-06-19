// src/core/governance/systemLenses.ts

export const RATIONAL_SYNTHESIS_LENS = "Rational Synthesis";
export const AFFECTIVE_SYNTHESIS_LENS = "Affective Synthesis";

export const SYSTEM_LENSES = [
    RATIONAL_SYNTHESIS_LENS,
    AFFECTIVE_SYNTHESIS_LENS
];

export const DEFAULT_DOMAIN_LENSES = [
    { id: 'Product', domains: ['Product'], autoReview: false },
    { id: 'Engineering', domains: ['Engineering'], autoReview: false },
    { id: 'Design', domains: ['Design'], autoReview: false },
    { id: 'Security', domains: ['Security'], autoReview: false },
    { id: 'Legal', domains: ['Legal'], autoReview: false }
];
