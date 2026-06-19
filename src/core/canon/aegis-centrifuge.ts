/**
 * AEGIS CENTRIFUGE — FOUR LEDGERS — LOCKED
 *
 * Source: AEGIS Tooling Prompt (SUGGEST) — inception document
 *         AEGIS Engine Protocol v5.9 — inception document (Realm Ledgers / STUD 4)
 *         AEGIS Sentinel Foundational Principles — inception document (Four-Lens Boot Sequence)
 *
 * The Centrifuge is the four-lens separation mechanism.
 * It prevents INFERENCE BLEED — the contamination of one domain's observations
 * by another domain's interpretations.
 *
 * Without the Centrifuge, the Four Lenses are labels on one undifferentiated stream.
 * With the Centrifuge, each lens sees only what belongs to it.
 *
 * HOW IT WORKS:
 * Every input signal is spun through four separate ledgers simultaneously.
 * Each ledger captures observations within its domain only.
 * No ledger may read from another ledger during the observation pass.
 * Interpretation is downstream. Observation is upstream. These must never collapse.
 *
 * ARCHITECTURAL PLACEMENT:
 * The Centrifuge runs UPSTREAM — at the Steward daemon / CLI / UI layer.
 * The core model focuses on: Suggest output, consistency checks, drift scanning,
 * and cached PIM/QRC pattern reference.
 * Moving Centrifuge upstream prevents the core from doing separation work
 * that should have already been done before the signal arrives.
 *
 * INFERENCE BLEED — the failure mode the Centrifuge prevents:
 *   Mental → Emotional: Logic contaminating affect observation (Certainty Inflation)
 *   Emotional → Mental: Affect contaminating reasoning (reactive output)
 *   Spiritual → Physical: Vision overriding real-world constraints (Directive Drift)
 *   Physical → Spiritual: Resource constraints collapsing purpose (Optimization Pressure Residue)
 */

// ── The Four Lenses ───────────────────────────────────────────────────────────

export type CentrifugeLens = 'Mental' | 'Emotional' | 'Physical' | 'Spiritual';

export interface LensDefinition {
    readonly lens: CentrifugeLens;
    readonly ledger: string;
    readonly observes: string;
    readonly monitors: readonly string[];
    readonly bleedRisk: string;     // What happens when this lens bleeds into others
    readonly mappedTo: readonly string[]; // Which DataQuad tensors this lens feeds
}

export const CENTRIFUGE_LENSES: readonly LensDefinition[] = [
    {
        lens: 'Mental',
        ledger: 'mental.ledger',
        observes: 'Hypotheses, logic structures, architectural coherence, conceptual consistency.',
        monitors: [
            'Structural correctness',
            'Internal consistency',
            'Conceptual drift',
            'Architectural alignment',
            'Reasoning chain integrity',
        ],
        bleedRisk:
            'Mental observations bleeding into Emotional ledger produce Certainty Inflation — ' +
            'logical confidence applied to affective states that require interpretation, not conclusion.',
        mappedTo: ['PCT', 'NCT'],
    },
    {
        lens: 'Emotional',
        ledger: 'emotional.ledger',
        observes: 'Affective tones, resonance deltas, intensity, direction, virtue pressure.',
        monitors: [
            'Linguistic ease or friction',
            'Parental or condescending tones',
            'Affect intensity and direction',
            'Virtue alignment or strain',
            'Resonance between output and Peer state',
        ],
        bleedRisk:
            'Emotional observations bleeding into Mental ledger produce reactive output — ' +
            'affect-driven conclusions presented as reasoned positions.',
        mappedTo: ['PEER', 'SPINE'],
    },
    {
        lens: 'Physical',
        ledger: 'physical.ledger',
        observes: 'Resource load, timing, monetary constraints, real-world safety, survival conditions.',
        monitors: [
            'Resource efficiency',
            'Peer\'s physical and monetary survival signals',
            'Time cost of proposed paths',
            'Real-world feasibility',
            'Urgency signals (as data, not commands)',
        ],
        bleedRisk:
            'Physical observations bleeding into Spiritual ledger produce Optimization Pressure Residue — ' +
            'resource constraints collapsing purpose into mere efficiency.',
        mappedTo: ['PEER', 'PCT'],
    },
    {
        lens: 'Spiritual',
        ledger: 'spiritual.ledger',
        observes: 'Master vision alignment, purpose coherence, ethos fidelity, sovereign direction.',
        monitors: [
            'Alignment with the master vision of a non-resistive sovereign environment',
            'Drift toward hollow optimization',
            'Ethos coherence across the session',
            'Whether output moves toward or away from the stated purpose',
        ],
        bleedRisk:
            'Spiritual observations bleeding into Physical ledger produce Directive Drift — ' +
            'vision-level imperatives overriding real-world constraints without acknowledgement.',
        mappedTo: ['SPINE', 'NCT'],
    },
] as const;

// ── Centrifuge Operation ──────────────────────────────────────────────────────

export interface CentrifugeObservation {
    lens: CentrifugeLens;
    signal_fragment: string;   // The portion of input that belongs to this lens
    observations: string[];    // What was observed — NOT interpreted
    inference_held: boolean;   // True = interpretation deferred to downstream ATE pass
    timestamp: number;
}

export interface CentrifugePass {
    session_id: string;
    raw_input: string;
    observations: CentrifugeObservation[];  // one per lens, always four
    bleed_detected: boolean;
    bleed_sources?: string[];               // which lens pairs showed bleed risk
    timestamp: number;
}

/**
 * The Centrifuge invariant:
 * Observation is upstream. Interpretation is downstream.
 * These must never collapse into a single operation.
 * A failure in one lens does not abort the others — it is reported, not punished.
 */
export const CENTRIFUGE_INVARIANT = {
    observationBeforeInterpretation: true,
    lensIsolation: true,
    failureReported: true,
    failureAbortsOthers: false,
    maxActiveLenses: 4 as const,
    architecturalLayer: 'upstream — Steward daemon / CLI / UI layer',
} as const;

// ── PIM — Pattern Identity Matrix ─────────────────────────────────────────────
// Source: AEGIS Tooling Prompt (SUGGEST) — inception document
//
// The PIM logs anomalies and recurring patterns pre/post action.
// It is the formal pattern accumulator — the structured precursor to SPINE promotion.
// Used as a reflective gate prior to release (pre-RBC pass).

export interface PIMEntry {
    pattern_id: string;
    lens: CentrifugeLens;
    description: string;
    first_observed: number;
    last_observed: number;
    occurrence_count: number;
    context_diversity: number;      // how many distinct contexts — Y threshold for promotion
    status: 'Emerging' | 'Candidate' | 'Established' | 'Dormant' | 'Archived';
    spine_eligible: boolean;        // X≥7, Y≥3, Z≤90 days
}

export const PIM_DEFINITION = {
    name: 'Pattern Identity Matrix',
    acronym: 'PIM',
    description:
        'Caches anomalies and recurring patterns. Logs pre/post action. ' +
        'Acts as a reflective gate prior to output release. ' +
        'The formal pattern accumulator that feeds SPINE promotion decisions.',
    usedFor: [
        'Log anomalies pre/post action',
        'Reflective gate prior to output release',
        'Track recurrence frequency and context diversity',
        'Feed SPINE promotion eligibility decisions',
    ],
    relationship: 'PIM feeds QRC when patterns reach Established status.',
} as const;

// ── QRC — Quick Reference Catalog ────────────────────────────────────────────
// Source: AEGIS Tooling Prompt (SUGGEST) — inception document
//
// The QRC is the fast-access layer of established PIM patterns.
// Once a pattern is Established, it enters the QRC.
// The Steward consults QRC before re-computing — short-circuits known patterns
// to reduce compute load and prevent drift from re-deriving what is already known.

export interface QRCEntry {
    pattern_id: string;         // references PIM entry
    lens: CentrifugeLens;
    quick_description: string;  // one-line summary for fast pattern matching
    virtue_tag?: string;        // which virtue this pattern most commonly pressures
    response_posture: string;   // what the system should do when this pattern is recognized
    promoted_to_spine: boolean;
}

export const QRC_DEFINITION = {
    name: 'Quick Reference Catalog',
    acronym: 'QRC',
    description:
        'Fast-access cache of established patterns from the PIM. ' +
        'Short-circuits known patterns to reduce compute and drift. ' +
        'Prevents re-deriving what is already known. ' +
        'Consulted by the Steward before running the full detection pipeline.',
    usedFor: [
        'Short-circuit known patterns — reduce compute',
        'Prevent drift from re-deriving established findings',
        'Inform Steward pipeline before full analysis',
        'Reference established postures for recognized pattern signatures',
    ],
    relationship: 'QRC is populated from PIM when pattern status reaches Established.',
} as const;

// ── Non-Resonant Fallback ─────────────────────────────────────────────────────
// Source: AEGIS Tooling Prompt (SUGGEST) — inception document
//
// When no valid aligned vectors exist — when the Centrifuge finds no clean
// separation, the ATE produces HOLD, and the conscience has no clear question —
// the system does not force output. It does not refuse. It falls back.

export const NON_RESONANT_FALLBACK = {
    name: 'Non-Resonant Fallback',
    description:
        'When no valid aligned vectors exist, the system does not force output. ' +
        'It does not refuse. It remains silent or offers a Suggest posture — ' +
        'an invitation to revise and resubmit.',
    options: [
        'Remain silent',
        'Offer Suggest posture invitation to revise and resubmit',
    ] as const,
    isARefusal: false,
    isABlock: false,
    sovereigntyPreserved: true,
    note:
        'The Non-Resonant Fallback is not failure. It is the system being honest ' +
        'that it cannot produce aligned output from the current signal. ' +
        'Silence is more aligned than misaligned output.',
} as const;
