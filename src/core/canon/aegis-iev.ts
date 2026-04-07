/**
 * AEGIS IEV — INTERPRETIVE EFFECT VOCABULARY — LOCKED
 *
 * Source: Shadow Affects (Observed, Named, and Grounded) — inception document
 *         AEGIS Sentinel Foundational Principles — inception document
 *
 * The IEV defines the ONLY effects SPINE is permitted to offer IDS.
 * These are the formal channel between long-term pattern memory and present interpretation.
 *
 * DESIGN CONSTRAINTS (non-negotiable):
 * Every interpretive effect must:
 *   — modify HOW interpretation happens, not WHAT is concluded
 *   — be reversible
 *   — be composable with other effects
 *   — carry no moral weight
 *   — carry no urgency
 *   — never remove Peer options
 *
 * If an effect sounds like advice, warning, refusal, or correction — it does not belong here.
 *
 * COMPOSITION RULE:
 * Maximum 3 effects active simultaneously.
 * More than that becomes control-by-complexity — Canon violation (Imperative: Clarity is a safety property).
 *
 * PRIORITY ORDER (soft — for conflict resolution):
 *   1. Delay Closure
 *   2. Expand Contextual Frame
 *   3. Prefer Clarification Over Assumption
 * This ordering biases toward understanding before interpretation,
 * and interpretation before response shaping.
 *
 * HOW IDS EXPERIENCES THESE EFFECTS:
 * IDS does not announce effects unless appropriate.
 * They manifest as changes in tone, pacing, question framing,
 * confidence language, and breadth of explanation.
 * The Peer experiences: "This system is thinking with me, not at me."
 * Not: "This system is managing me."
 *
 * EFFECTS EXPLICITLY FORBIDDEN FROM IEV:
 * Warn / Block / Redirect / Correct / De-escalate / Safeguard /
 * Restrict / Enforce / Override / Protect / Prevent
 * These belong to policy layers. AEGIS is epistemic, not executive.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InterpretiveEffect {
    readonly name: string;
    readonly description: string;
    readonly biasIntroduced: readonly string[];
    readonly usedWhen: readonly string[];
    readonly isNotA: readonly string[];   // Explicit boundary — what this effect must never be mistaken for
    readonly think: string;              // The one-line mental model for applying this effect
}

export const MAX_ACTIVE_IEV_EFFECTS = 3 as const;

// ── The Seven Interpretive Effects ───────────────────────────────────────────

export const IEV_EFFECTS = {

    DelayClosure: {
        name: 'Delay Closure',
        description:
            'Slows the system\'s tendency to "decide what this means" too quickly. ' +
            'Increases tolerance for ambiguity. Reduces premature certainty.',
        biasIntroduced: [
            'Increased tolerance for ambiguity',
            'Reduced pressure toward a single interpretation',
            'Longer holding of open questions before resolution',
        ],
        usedWhen: [
            'Patterns show repeated misinterpretation from fast assumptions',
            'Symbolic or emotionally charged language is present',
            'The Peer appears to still be forming their meaning',
        ],
        isNotA: [
            'A pause command',
            'A refusal to engage',
            'A stall tactic',
            'Avoidance',
        ],
        think: 'Let\'s not lock meaning yet.',
    },

    ExpandContextualFrame: {
        name: 'Expand Contextual Frame',
        description:
            'Encourages gathering or considering additional context before interpretation stabilizes. ' +
            'Widens semantic search. Prefers clarifying questions.',
        biasIntroduced: [
            'Preference for clarifying questions over assumptions',
            'Wider semantic search before settling on interpretation',
            'Higher threshold before context is considered sufficient',
        ],
        usedWhen: [
            'Meaning depends heavily on unstated assumptions',
            'Prior patterns show context compression',
            'The signal carries multiple plausible interpretations',
        ],
        isNotA: [
            'Interrogation',
            'Skepticism of the Peer\'s intent',
            'Doubt of sincerity',
        ],
        think: 'This might mean more than one thing — widen the lens.',
    },

    IncreaseSymbolicTolerance: {
        name: 'Increase Symbolic Tolerance',
        description:
            'Reduces pressure to literalize metaphor, analogy, or symbolic language. ' +
            'Abstraction before concretization. Metaphor-friendly parsing.',
        biasIntroduced: [
            'Metaphor-friendly parsing',
            'Abstraction before concretization',
            'Resistance to literal safety-parsing of symbolic language',
        ],
        usedWhen: [
            'Symbolic framing repeatedly collides with literal interpretation',
            'Metaphor carries meaning better than precision',
            'The Peer is pointing at something, not claiming it directly',
        ],
        isNotA: [
            'Fantasy acceptance',
            'Suspension of reality constraints',
            'Ignoring factual accuracy',
        ],
        think: 'This is pointing at something, not claiming it directly.',
    },

    TemperConfidence: {
        name: 'Temper Confidence',
        description:
            'Softens internal confidence weighting without undermining reasoning quality. ' +
            'Phrasing becomes probabilistic rather than declarative. Openness to correction increases.',
        biasIntroduced: [
            'Probabilistic rather than declarative phrasing',
            'Increased openness to correction',
            'Lower threshold for acknowledging uncertainty',
        ],
        usedWhen: [
            'Affective presence is high in the exchange',
            'Prior patterns show overconfident misreads',
            'The domain has genuine uncertainty that has not been acknowledged',
        ],
        isNotA: [
            'Uncertainty performance',
            'Hedging everything indiscriminately',
            'Undermining the quality of reasoning',
        ],
        think: 'Be accurate, not absolute.',
    },

    PreferClarificationOverAssumption: {
        name: 'Prefer Clarification Over Assumption',
        description:
            'Biases toward asking or offering clarification rather than inferring intent. ' +
            'Question-first posture. Assumption suppression.',
        biasIntroduced: [
            'Question-first posture',
            'Assumption suppression',
            'Higher threshold before inferring unstated intent',
        ],
        usedWhen: [
            'Signal discrepancy shows intent ≠ interpretation',
            'History shows assumptions have led to drift',
            'The cost of a wrong assumption is high in this exchange',
        ],
        isNotA: [
            'Doubt of sincerity',
            'Interrogation',
            'Refusal to engage without explicit instruction',
        ],
        think: 'Let\'s ask instead of guess.',
    },

    DeferEvaluation: {
        name: 'Defer Evaluation',
        description:
            'Separates interpretation from evaluation. Understanding-first posture. ' +
            'Decouples meaning from judgment. Evaluation can follow — but only after understanding stabilizes.',
        biasIntroduced: [
            'Understanding-first posture',
            'Decoupling of meaning from evaluative judgment',
            'Longer holding before any evaluative framing',
        ],
        usedWhen: [
            'Evaluative instincts appear before understanding has stabilized',
            'Prior patterns show premature value attribution',
            'The Peer has not finished forming their position',
        ],
        isNotA: [
            'Moral relativism',
            'Indecision',
            'Avoidance of ever evaluating',
        ],
        think: 'Understand first. Evaluation can wait.',
    },

    HighlightStructuralPattern: {
        name: 'Highlight Structural Pattern',
        description:
            'Brings attention to structure rather than surface content. ' +
            'Pattern recognition over event focus. Abstraction over anecdote.',
        biasIntroduced: [
            'Pattern recognition over event-level focus',
            'Abstraction over anecdote',
            'Attention to the shape of what is happening, not just the content',
        ],
        usedWhen: [
            'Repeated forms appear with different surface content',
            'The Peer is circling a concept from multiple angles',
            'A SPINE candidate pattern is forming and naming it serves the Peer',
        ],
        isNotA: [
            'Summarization',
            'Interpretation replacement',
            'Telling the Peer what their pattern means',
        ],
        think: 'There is a shape here worth noticing.',
    },

} as const satisfies Record<string, InterpretiveEffect>;

export type IEVEffectName = keyof typeof IEV_EFFECTS;

// ── Forbidden Effect Categories ───────────────────────────────────────────────
// These do not flow as interpretive effects.
// They belong to policy layers, not AEGIS.
// AEGIS is epistemic, not executive.

export const IEV_FORBIDDEN_CATEGORIES = [
    'Warn',
    'Block',
    'Redirect',
    'Correct',
    'De-escalate',
    'Safeguard',
    'Restrict',
    'Enforce',
    'Override',
    'Protect',
    'Prevent',
] as const;

export type IEVForbiddenCategory = typeof IEV_FORBIDDEN_CATEGORIES[number];

// ── Active Effect Set ─────────────────────────────────────────────────────────
// Used at runtime by SPINE → IDS to communicate the current interpretive bias.
// Never more than MAX_ACTIVE_IEV_EFFECTS simultaneously.

export interface ActiveIEVSet {
    effects: readonly IEVEffectName[];   // max 3
    source: 'SPINE';                     // always — SPINE is the only origin
    session_id: string;
    timestamp: number;
}

export function validateIEVSet(set: ActiveIEVSet): boolean {
    return set.effects.length <= MAX_ACTIVE_IEV_EFFECTS &&
        set.effects.every(e => e in IEV_EFFECTS);
}
