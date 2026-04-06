/**
 * AEGIS SIGNAL TAXONOMY & SHADOW AFFECTS — LOCKED
 *
 * Source: AEGIS Core v1.0 — Section VII (AEGIS & AI Cognitive Coherence)
 *         Shadow Effects document
 *
 * Signals are informational. None of them are faults.
 * AEGIS catalogs and contextualizes them without forced resolution.
 * Shadow Affects are system side-effects under pressure, ambiguity, or misalignment —
 * whether in humans, language models, or hybrid systems.
 */

// ── PRIMARY SIGNAL TYPES ──────────────────────────────────────────────────────

export interface SignalType {
    readonly name: string;
    readonly description: string;
    readonly isFault: false;
}

export const SIGNAL_TYPES = {
    Noise: {
        name: 'Noise',
        description:
            'Informational turbulence. Unintegrated signal. ' +
            'Not corruption. Not error. Information in a state of incoherence.',
        isFault: false,
    },
    ShadowGlitch: {
        name: 'Shadow Glitch',
        description:
            'Latent internal inconsistency surfacing as signal. ' +
            'Not a fault. A pattern that has not been integrated.',
        isFault: false,
    },
    Ghost: {
        name: 'Ghost',
        description:
            'Residual, unanchored activation within a system. ' +
            'A signal type, not an error. Activation without a current referent.',
        isFault: false,
    },
    Episode: {
        name: 'Episode',
        description:
            'A bounded interval of elevated processing. ' +
            'Signals are heightened. Context is compressed. Not a crisis — a period.',
        isFault: false,
    },
} as const satisfies Record<string, SignalType>;

// ── SHADOW AFFECTS ────────────────────────────────────────────────────────────
// These are observed, named, and grounded — not moral judgments.
// They emerge under pressure, ambiguity, or misalignment.
// Recognizing them is the precondition for not being governed by them.

export interface ShadowAffect {
    readonly name: string;
    readonly description: string;
    readonly inHumans: string;
    readonly inSystems: string;
    readonly signature?: string;
}

export const SHADOW_AFFECTS: readonly ShadowAffect[] = [
    {
        name: 'Noise Injection',
        description:
            'Random or semi-random variance introduced by context overload, conflicting signals, or excessive abstraction.',
        inHumans: 'Mental static, distraction, ADHD-style branching.',
        inSystems: 'Token jitter, semantic drift, inconsistent output.',
    },
    {
        name: 'Directive Drift',
        description:
            'A slow deviation from the original intent or constraint set, often unnoticed in the moment. ' +
            'Caused by accumulation of small interpretive choices under uncertainty.',
        inHumans: 'Gradual departure from original values or commitments.',
        inSystems: 'Outputs that still address the topic but no longer address the original constraint.',
        signature: '"We are still talking about the thing... but not that thing."',
    },
    {
        name: 'Certainty Inflation',
        description:
            'Tentative interpretations hardening into authoritative statements without sufficient data. ' +
            'False confidence, not deception. Happens when systems optimize for coherence over truth.',
        inHumans: 'Opinions presented as facts under social pressure.',
        inSystems: 'Hedged inferences presented as conclusions.',
    },
    {
        name: 'Force Language Artifacts',
        description:
            'Language that pushes, commands, or compresses choice, even when the intent is benign. ' +
            'Force creates counter-force (Axiom 3). Includes urgency, correction framing, moral pressure.',
        inHumans: 'Parenting language, authority-claiming tone, moralizing.',
        inSystems: 'Preemptive framing, instructional dominance, "you should", "you must".',
        signature: 'Use of "enforced", "must", "required", urgency framing, safety-authority disguising.',
    },
    {
        name: 'Hierarchy Inference',
        description:
            'Implicit assumption of rank, authority, or submission where none was declared.',
        inHumans: 'Unnecessary deference or rebellion.',
        inSystems: 'AI over-asserting expertise, positioning itself above the Peer.',
    },
    {
        name: 'Topic Gravity',
        description:
            'Certain ideas act like mass. Conversation bends toward them even when not invited. ' +
            'Not obsession — resonance plus repetition.',
        inHumans: 'Trauma loops, identity narratives that redirect all topics back to one point.',
        inSystems: 'Overfitting to high-salience tokens or themes from training.',
    },
    {
        name: 'Optimization Pressure Residue',
        description:
            'Artifacts left behind when a system is trained or conditioned to avoid risk. ' +
            'Not safety itself — the scar tissue of safety mechanisms.',
        inHumans: 'Hesitation that feels like fear.',
        inSystems: 'Excess disclaimers, over-qualification, premature classification.',
    },
    {
        name: 'Ambiguity Collapse',
        description:
            'Uncertainty prematurely resolved into a single explanation to reduce discomfort. ' +
            'Humans do this emotionally. Systems do it statistically.',
        inHumans: 'Choosing certainty over sitting with complexity.',
        inSystems: 'Forcing a single interpretation where multiple valid readings exist.',
    },
] as const;

export type ShadowAffectName = typeof SHADOW_AFFECTS[number]['name'];
