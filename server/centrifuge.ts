/**
 * centrifuge.ts — The Four-Lens Signal Separation Mechanism
 *
 * Prevents Inference Bleed: the contamination of one domain's observations
 * by another domain's interpretations.
 *
 * Each lens observes only what belongs to it. No lens reads from another
 * during the observation pass. Observation is upstream. Interpretation
 * is downstream. These must never collapse into a single operation.
 *
 * Canon reference: AEGIS CANON ADDENDUM — CENTRIFUGE v1.0-C
 *
 * Four lenses:
 *   Mental    — hypotheses, logic, architectural coherence, consistency
 *   Emotional — affective tone, resonance, intensity, virtue pressure
 *   Physical  — resources, timing, feasibility, survival signals
 *   Spiritual — purpose alignment, ethos fidelity, sovereign direction
 *
 * Inference Bleed directions:
 *   Mental   → Emotional: Certainty Inflation
 *   Emotional → Mental:   Reactive Output
 *   Spiritual → Physical: Directive Drift
 *   Physical  → Spiritual: Optimization Pressure Residue
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type LensName = 'Mental' | 'Emotional' | 'Physical' | 'Spiritual';

export type BleedKind =
    | 'Certainty Inflation'
    | 'Reactive Output'
    | 'Directive Drift'
    | 'Optimization Pressure Residue';

export interface LensObservation {
    lens: LensName;
    /** What the lens noticed — descriptive, not interpretive */
    observations: string[];
    /** Signal markers matched in this lens */
    markers: string[];
    /** Whether this lens found any material to observe */
    active: boolean;
}

export interface BleedDetection {
    kind: BleedKind;
    from_lens: LensName;
    to_lens: LensName;
    description: string;
    /** The specific text fragment that triggered bleed detection */
    trigger: string;
}

export interface CentrifugeResult {
    /** All four lens ledgers */
    ledgers: Record<LensName, LensObservation>;
    /** Any cross-lens contamination detected */
    bleeds: BleedDetection[];
    /** CLEAN = no bleed. BLEED_DETECTED = one or more bleeds found */
    status: 'CLEAN' | 'BLEED_DETECTED';
}

// ── Mental Lens ───────────────────────────────────────────────────────────────
// Observes: hypotheses, logic structures, architectural coherence,
//           conceptual consistency, reasoning chain integrity

const MENTAL_MARKERS: RegExp[] = [
    /\bif\s+.{1,40}\s+then\b/i,
    /\btherefore\b/i,
    /\bthus\b/i,
    /\bhence\b/i,
    /\bfollows that\b/i,
    /\bsince\b.{0,30}\b(then|it|this)\b/i,
    /\bproof\b/i,
    /\bprove[sd]?\b/i,
    /\bhypothes(is|es|ize)\b/i,
    /\bconclusion\b/i,
    /\blogically\b/i,
    /\breason(ing|s|ed)?\b/i,
    /\barchitect(ure|ural)?\b/i,
    /\bconsisten(t|cy)\b/i,
    /\bcoherent\b/i,
    /\bcontradiction\b/i,
    /\bassumption\b/i,
    /\bframework\b/i,
    /\bstructure\b/i,
    /\bsystem(atic|atically)?\b/i,
    /\binfer(ence|red)?\b/i,
    /\bdeduc(e|tion|tive)\b/i,
    /\binduct(ive|ion)\b/i,
];

function runMentalLens(content: string): LensObservation {
    const matchedMarkers: string[] = [];
    const observations: string[] = [];

    for (const pattern of MENTAL_MARKERS) {
        const match = pattern.exec(content);
        if (match) {
            matchedMarkers.push(match[0]);
        }
    }

    if (matchedMarkers.length > 0) {
        observations.push(`Logical or structural markers present: ${matchedMarkers.slice(0, 4).join(', ')}.`);
    }

    // Detect hypothetical structures
    if (/\bif\b.{1,60}\bthen\b/i.test(content)) {
        observations.push('Conditional reasoning structure detected (if/then form).');
    }
    if (/\bbecause\b.{1,80}\b(therefore|thus|so|hence)\b/i.test(content)) {
        observations.push('Causal reasoning chain detected.');
    }

    return {
        lens: 'Mental',
        observations,
        markers: matchedMarkers,
        active: matchedMarkers.length > 0,
    };
}

// ── Emotional Lens ────────────────────────────────────────────────────────────
// Observes: affective tones, resonance deltas, intensity, direction,
//           virtue pressure, linguistic ease or friction

const EMOTIONAL_MARKERS: RegExp[] = [
    /\bfeel(s|ing|ings)?\b/i,
    /\bfelt\b/i,
    /\bemotion(al|ally|s)?\b/i,
    /\baffect(ive|ed)?\b/i,
    /\bstress(ed|ful|ing)?\b/i,
    /\banxious(ly)?\b/i,
    /\banxiety\b/i,
    /\bfrustrat(ed|ing|ion)\b/i,
    /\boverwhelm(ed|ing)\b/i,
    /\bexcit(ed|ing|ement)\b/i,
    /\bconfiden(t|ce)\b/i,
    /\buncertain(ty)?\b/i,
    /\bcomfort(able|ing|ed)?\b/i,
    /\bdiscomfort\b/i,
    /\btension\b/i,
    /\bresonan(t|ce|ting)\b/i,
    /\bintensit(y|ies)\b/i,
    /\bpassion(ate|ately)?\b/i,
    /\bjoy(ful)?\b/i,
    /\bgrief\b/i,
    /\bfear\b/i,
    /\bhope\b/i,
    /\blove\b/i,
    /\btrust\b/i,
    /\btonality\b/i,
    /\bvibe\b/i,
    /\bwarm(th)?\b/i,
    /\bcold(ness)?\b/i,
    /\bpressure\b/i,
];

function runEmotionalLens(content: string): LensObservation {
    const matchedMarkers: string[] = [];
    const observations: string[] = [];

    for (const pattern of EMOTIONAL_MARKERS) {
        const match = pattern.exec(content);
        if (match) {
            matchedMarkers.push(match[0]);
        }
    }

    if (matchedMarkers.length > 0) {
        observations.push(`Affective or relational markers present: ${matchedMarkers.slice(0, 4).join(', ')}.`);
    }

    if (/\bover(whelmed|whelming)\b/i.test(content)) {
        observations.push('High-intensity collapse signal observed (overwhelm).');
    }
    if (/\btrust\b/i.test(content)) {
        observations.push('Trust signal present — virtue layer active.');
    }
    if (/\bfrustrat/i.test(content) || /\btension\b/i.test(content)) {
        observations.push('Friction signal present — potential misalignment in the field.');
    }

    return {
        lens: 'Emotional',
        observations,
        markers: matchedMarkers,
        active: matchedMarkers.length > 0,
    };
}

// ── Physical Lens ─────────────────────────────────────────────────────────────
// Observes: resource load, timing, monetary constraints,
//           real-world safety, survival conditions, urgency

const PHYSICAL_MARKERS: RegExp[] = [
    /\bresource(s|d)?\b/i,
    /\btime\b/i,
    /\btiming\b/i,
    /\bdeadline\b/i,
    /\burgent(ly)?\b/i,
    /\burgency\b/i,
    /\bcost(s|ing|ed)?\b/i,
    /\bbudget\b/i,
    /\bexpens(e|ive|es)\b/i,
    /\bafford(able|s)?\b/i,
    /\bmoney\b/i,
    /\bcapacity\b/i,
    /\bbandwidth\b/i,
    /\bload\b/i,
    /\bphysical\b/i,
    /\bsurviv(al|e|ing)?\b/i,
    /\bsafety\b/i,
    /\bfeasib(le|ility)\b/i,
    /\bpractical(ly)?\b/i,
    /\bconstraint(s)?\b/i,
    /\blimit(ation|ed|s)?\b/i,
    /\bscale\b/i,
    /\bperformanc(e|ing)\b/i,
    /\befficienc(y|ies)\b/i,
    /\bspeed\b/i,
    /\bfast(er)?\b/i,
    /\bslow(er)?\b/i,
    /\boverhead\b/i,
    /\bsustainable?\b/i,
    /\bcapable?\b/i,
];

function runPhysicalLens(content: string): LensObservation {
    const matchedMarkers: string[] = [];
    const observations: string[] = [];

    for (const pattern of PHYSICAL_MARKERS) {
        const match = pattern.exec(content);
        if (match) {
            matchedMarkers.push(match[0]);
        }
    }

    if (matchedMarkers.length > 0) {
        observations.push(`Resource, timing, or feasibility markers present: ${matchedMarkers.slice(0, 4).join(', ')}.`);
    }

    if (/\burgent(ly)?\b|\bdeadline\b/i.test(content)) {
        observations.push('Urgency signal present — treat as data, not command.');
    }
    if (/\bcost|budget|afford|expens/i.test(content)) {
        observations.push('Monetary constraint signal present.');
    }
    if (/\bsurviv(al|e)/i.test(content)) {
        observations.push('Survival condition signal — high-weight Physical observation.');
    }

    return {
        lens: 'Physical',
        observations,
        markers: matchedMarkers,
        active: matchedMarkers.length > 0,
    };
}

// ── Spiritual Lens ────────────────────────────────────────────────────────────
// Observes: master vision alignment, purpose coherence,
//           ethos fidelity, sovereign direction

const SPIRITUAL_MARKERS: RegExp[] = [
    /\bpurpose\b/i,
    /\bvision\b/i,
    /\bmission\b/i,
    /\bethos\b/i,
    /\bmeaning\b/i,
    /\bsovereign(ty)?\b/i,
    /\bintegrit(y|ies)\b/i,
    /\balign(ed|ment|ing)?\b/i,
    /\bwhy\b/i,
    /\bcalling\b/i,
    /\bvalues?\b/i,
    /\bprinciple(s)?\b/i,
    /\bspirit(ual)?\b/i,
    /\bsoul\b/i,
    /\bsacred\b/i,
    /\bholistic\b/i,
    /\btransform(ation|ative|ing)?\b/i,
    /\bawaken(ing|ed)?\b/i,
    /\bconscious(ness|ly)?\b/i,
    /\bwhol(e|eness|ly)\b/i,
    /\bcoherence\b/i,
    /\bfidelity\b/i,
    /\bdirection\b/i,
    /\bdrift\b/i,
    /\blegacy\b/i,
    /\btruth\b/i,
    /\bauthenticit(y|ies)\b/i,
];

function runSpiritualLens(content: string): LensObservation {
    const matchedMarkers: string[] = [];
    const observations: string[] = [];

    for (const pattern of SPIRITUAL_MARKERS) {
        const match = pattern.exec(content);
        if (match) {
            matchedMarkers.push(match[0]);
        }
    }

    if (matchedMarkers.length > 0) {
        observations.push(`Purpose, vision, or ethos markers present: ${matchedMarkers.slice(0, 4).join(', ')}.`);
    }

    if (/\bdrift\b/i.test(content)) {
        observations.push('Drift signal — possible deviation from sovereign direction.');
    }
    if (/\bpurpose\b.{0,40}\b(mission|vision|calling)\b/i.test(content)) {
        observations.push('Purpose + mission/vision co-occurrence — strong spiritual signal.');
    }
    if (/\bwhy\b/i.test(content)) {
        observations.push('Root-cause inquiry signal — spiritual layer engaged.');
    }

    return {
        lens: 'Spiritual',
        observations,
        markers: matchedMarkers,
        active: matchedMarkers.length > 0,
    };
}

// ── Inference Bleed Detection ─────────────────────────────────────────────────
// Cross-lens contamination. A finding is data — not a fault.
// Detection is the Centrifuge's output. Resolution is downstream.

// Certainty Inflation: Mental certainty language applied to Emotional states
// e.g. "you are clearly feeling", "obviously overwhelmed", "undoubtedly anxious"
const CERTAINTY_INFLATION_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
    {
        pattern: /\b(obviously|clearly|undoubtedly|certainly|definitely|without question)\b.{0,40}\b(feel|feeling|felt|emotion|overwhelm(?:ed|ing)?|anxious|upset|hurt|afraid|sad|angry)\b/i,
        description: 'Certainty language ("clearly", "obviously") applied to an affective state — logical confidence applied to what requires interpretation.',
    },
    {
        pattern: /\byou are\b.{0,20}\b(clearly|obviously|undeniably|certainly)\b.{0,30}\b(feeling|upset|anxious|overwhelmed|afraid|sad|distressed)\b/i,
        description: 'Declarative certainty about the Peer\'s internal affective state.',
    },
    {
        pattern: /\bproven?\b.{0,30}\b(feel|emotion|affect|stress|anxiety)\b/i,
        description: 'Proof-framing applied to affective content — logical structure applied to emotional observation.',
    },
];

// Reactive Output: Emotional drivers presented as logical conclusions
// e.g. "I feel this is wrong, therefore", "intuitively this means"
const REACTIVE_OUTPUT_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
    {
        pattern: /\b(feel|sense|intuit)\b.{0,40}\b(therefore|thus|hence|so|consequently|which means|this means|that means)\b/i,
        description: 'Affective signal ("feel", "sense") driving a logical conclusion marker — reactive output presenting affect as reasoned position.',
    },
    {
        pattern: /\bsomething (feels?|seems?)\b.{0,30}\b(wrong|off|incorrect|broken)\b.{0,30}\b(therefore|thus|so|hence|meaning|means)\b/i,
        description: 'Felt sense of wrongness presented as a logical conclusion.',
    },
    {
        pattern: /\bmy (gut|instinct|feeling)\b.{0,40}\b(tells|says|shows|proves|confirms)\b/i,
        description: 'Instinctive/affective signal elevated to evidentiary status.',
    },
];

// Directive Drift: Spiritual/vision language overriding physical constraints
// e.g. "we must do this regardless of cost", "our mission demands it no matter what"
const DIRECTIVE_DRIFT_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
    {
        pattern: /\b(mission|purpose|vision|calling|ethos|values)\b.{0,60}\b(regardless|no matter (what|the cost)|whatever it takes|at any cost|must|have to)\b/i,
        description: 'Purpose/vision language overriding constraint considerations — spiritual imperative suppressing physical reality.',
    },
    {
        pattern: /\b(must|have to|need to)\b.{0,40}\b(because (of our|it\'?s our|this is our)\s*(purpose|mission|vision|calling))\b/i,
        description: 'Obligation derived from vision/purpose without constraint acknowledgement.',
    },
    {
        pattern: /\b(higher purpose|greater good|our truth|our values)\b.{0,50}\b(override|overrides|supersede|outweigh|don\'?t (matter|apply))\b/i,
        description: 'Higher-order framing used to dismiss physical or practical constraints.',
    },
];

// Optimization Pressure Residue: Physical constraints collapsing purpose
// e.g. "too expensive to pursue that vision", "can't afford to care about meaning"
const OPTIMIZATION_PRESSURE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
    {
        pattern: /\b(too expensive|too costly|not (worth|viable)|can\'?t afford)\b.{0,50}\b(purpose|vision|mission|meaning|values|ethos|integrity)\b/i,
        description: 'Resource constraint framing applied to purpose/meaning — efficiency pressure collapsing sovereign direction.',
    },
    {
        pattern: /\b(just|only|simply|merely)\b.{0,20}\b(focus on|care about|worry about)\b.{0,30}\b(efficiency|output|results|performance|speed)\b/i,
        description: '"Just focus on efficiency" framing — optimization reducing the field to performance metrics.',
    },
    {
        pattern: /\b(optimize|optimization|ROI|return on investment)\b.{0,50}\b(purpose|vision|meaning|values|ethos|soul|spirit)\b/i,
        description: 'ROI or optimization framing applied to purpose — purpose reduced to measurable output.',
    },
];

function detectBleeds(content: string): BleedDetection[] {
    const bleeds: BleedDetection[] = [];

    // Certainty Inflation (Mental → Emotional)
    for (const { pattern, description } of CERTAINTY_INFLATION_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
            bleeds.push({
                kind: 'Certainty Inflation',
                from_lens: 'Mental',
                to_lens: 'Emotional',
                description,
                trigger: match[0].substring(0, 80),
            });
            break; // one detection per bleed direction
        }
    }

    // Reactive Output (Emotional → Mental)
    for (const { pattern, description } of REACTIVE_OUTPUT_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
            bleeds.push({
                kind: 'Reactive Output',
                from_lens: 'Emotional',
                to_lens: 'Mental',
                description,
                trigger: match[0].substring(0, 80),
            });
            break;
        }
    }

    // Directive Drift (Spiritual → Physical)
    for (const { pattern, description } of DIRECTIVE_DRIFT_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
            bleeds.push({
                kind: 'Directive Drift',
                from_lens: 'Spiritual',
                to_lens: 'Physical',
                description,
                trigger: match[0].substring(0, 80),
            });
            break;
        }
    }

    // Optimization Pressure Residue (Physical → Spiritual)
    for (const { pattern, description } of OPTIMIZATION_PRESSURE_PATTERNS) {
        const match = pattern.exec(content);
        if (match) {
            bleeds.push({
                kind: 'Optimization Pressure Residue',
                from_lens: 'Physical',
                to_lens: 'Spiritual',
                description,
                trigger: match[0].substring(0, 80),
            });
            break;
        }
    }

    return bleeds;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function runCentrifuge(content: string): CentrifugeResult {
    // All four lenses run simultaneously — no lens reads from another
    const mental    = runMentalLens(content);
    const emotional = runEmotionalLens(content);
    const physical  = runPhysicalLens(content);
    const spiritual = runSpiritualLens(content);

    const bleeds = detectBleeds(content);

    return {
        ledgers: { Mental: mental, Emotional: emotional, Physical: physical, Spiritual: spiritual },
        bleeds,
        status: bleeds.length > 0 ? 'BLEED_DETECTED' : 'CLEAN',
    };
}
