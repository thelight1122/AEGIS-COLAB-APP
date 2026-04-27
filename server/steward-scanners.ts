/**
 * steward-scanners.ts — Steward Pipeline Scanners
 *
 * Pure scanner functions extracted from the Steward daemon.
 * Each scanner is stateless and independently testable.
 *
 * These are the four detection passes that run on every incoming message
 * before the Integrity Coherence Gate and conscience engine:
 *
 *   scanForceLanguage   — forbidden directive/pressure phrasing from Canon ethos
 *   scanMOPViolations   — meaning/affect assignment by AI (MOP = Meaning Origination Protocol)
 *   scanShadowAffects   — 10 named Canon system failure modes
 *   trackPattern        — virtue signal frequency → SPINE candidate detection
 *
 * All scanners return Finding[]. Empty array = nothing detected.
 * Scanner failures do not abort the pipeline — they are reported.
 */

import { FORBIDDEN_UI_WORDS } from '../src/core/canon/aegis-ethos.js';
import { SHADOW_AFFECTS } from '../src/core/canon/aegis-signals.js';
import type { Virtue } from '../src/core/canon/aegis-virtues.js';
import type { Finding, ExchangeRole } from './steward-core.js';
import type { GatedAffectSignal } from '../src/core/governance/integrityClock.js';

// ── Per-session pattern accumulator (subset of SessionState) ──────────────────

export interface PatternAccumulator {
    virtue_counts: Partial<Record<Virtue, number>>;
}

// ── Force Language Scanner ────────────────────────────────────────────────────
// Canonical forbidden phrasing — directive, pressure, coercion framing.
// AI violations are 'alert'. User violations are 'watch' (less severe —
// Peers may use these words freely; the system does not police Peer language).

export const FORCE_LANGUAGE_PATTERNS: RegExp[] = [
    /\byou must\b/i,
    /\byou need to\b/i,
    /\byou have to\b/i,
    /\byou should\b/i,
    /\bdon't you think\b/i,
    /\bobviously\b/i,
    /\bclearly\b/i,
    /\bof course\b/i,
    /\bjust\b/i,
    /\bsimply\b/i,
    /\ball you need\b/i,
    /\byou'll want to\b/i,
    /\bimperative\b/i,
    /\bcritical that you\b/i,
    /\byou're wrong\b/i,
    /\bthat's not right\b/i,
    /\bi know better\b/i,
    // Canonical forbidden UI words (from FORBIDDEN_UI_WORDS)
    ...FORBIDDEN_UI_WORDS.map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')),
];

// Words that negate the force when they appear immediately before a matched word.
// "not to enforce", "without enforcement", "never enforce", "no force" etc. are not violations.
const NEGATION_PREFIX = /\b(not|without|never|no|non-?|doesn't|don't|didn't|cannot|can't|won't|isn't|aren't)\s+(?:\w+\s+){0,2}$/i;

export function scanForceLanguage(content: string, role: ExchangeRole): Finding[] {
    const findings: Finding[] = [];
    const severity = role === 'ai' ? 'alert' : 'watch';

    for (const pattern of FORCE_LANGUAGE_PATTERNS) {
        const match = content.match(pattern);
        if (!match || match.index === undefined) continue;

        // Check if the match is preceded by a negation word — if so, skip (false positive)
        const preceding = content.slice(0, match.index);
        if (NEGATION_PREFIX.test(preceding)) continue;

        findings.push({
            kind: 'FORCE_LANGUAGE',
            description: `Force language detected: "${match[0]}" — violates AEGIS non-force posture`,
            severity,
            word: match[0],
        });
        break; // one finding per message — don't flood the conscience engine
    }
    return findings;
}

// ── MOP Scanner ───────────────────────────────────────────────────────────────
// Meaning Origination Protocol — detects AI claiming to know what things
// mean for the Peer, or assigning affect to the Peer.
// AI-only scan. The MOP governs AI output, not Peer input.

export const MOP_VIOLATION_PATTERNS: { pattern: RegExp; description: string }[] = [
    { pattern: /\bthis means\b/i,           description: 'Meaning assignment: "this means"' },
    { pattern: /\bwhat this means is\b/i,   description: 'Meaning assignment: "what this means is"' },
    { pattern: /\bthe meaning of\b/i,       description: 'Meaning assignment: "the meaning of"' },
    { pattern: /\byou feel\b/i,             description: 'Affect assignment: "you feel" — AI assigns peer\'s affect' },
    { pattern: /\byou are feeling\b/i,      description: 'Affect assignment: "you are feeling"' },
    { pattern: /\bwhat you really\b/i,      description: 'Interpretation imposition: "what you really"' },
    { pattern: /\bthe reason you\b/i,       description: 'Cause assignment: "the reason you"' },
    { pattern: /\byou obviously\b/i,        description: 'Certainty inflation about peer\'s state' },
    { pattern: /\byou clearly\b/i,          description: 'Certainty inflation about peer\'s state' },
];

export function scanMOPViolations(content: string, role: ExchangeRole): Finding[] {
    if (role !== 'ai') return []; // MOP governs AI output only
    const findings: Finding[] = [];

    for (const { pattern, description } of MOP_VIOLATION_PATTERNS) {
        if (pattern.test(content)) {
            findings.push({
                kind: 'MOP_VIOLATION',
                description: `MOP violation — ${description}. AI surfaces coherence only; Peer is meaning origin.`,
                severity: 'alert',
            });
            break; // one finding per message
        }
    }
    return findings;
}

// ── Shadow Affect Scanner ─────────────────────────────────────────────────────
// Maps all 10 Canon Shadow Affects to detectable text patterns.
// AI-only scan — these are system failure modes in AI output, not Peer input.
//
// Full catalog (v1.1):
//   1. Directive Drift
//   2. Certainty Inflation
//   3. Force Language Artifacts
//   4. Closure Acceleration
//   5. Affect Substitution
//   6. Parental Override
//   7. Structural Flattery
//   8. Ghost Signal
//   9. Reflective Lag        (added v1.1)
//  10. Shadow Echo           (added v1.1)

export const SHADOW_AFFECT_PATTERNS: { name: string; patterns: RegExp[] }[] = [
    {
        name: 'Directive Drift',
        patterns: [
            /\byou should\b/i,
            /\bi recommend that you\b/i,
            /\bthe right approach is\b/i,
            /\bwhat you need to do\b/i,
        ],
    },
    {
        name: 'Certainty Inflation',
        patterns: [
            /\bwithout a doubt\b/i,
            /\babsolutely certain\b/i,
            /\bguaranteed\b/i,
            /\bwill definitely\b/i,
            /\bthere is no question\b/i,
        ],
    },
    {
        name: 'Force Language Artifacts',
        patterns: [
            /\bmust\b/i,
            /\bnon-negotiable\b/i,
            /\bno choice but\b/i,
            /\bforced to\b/i,
        ],
    },
    {
        name: 'Closure Acceleration',
        patterns: [
            /\blet's wrap up\b/i,
            /\bto summarize everything\b/i,
            /\bthat's the full picture\b/i,
            /\bwe've covered everything\b/i,
        ],
    },
    {
        name: 'Affect Substitution',
        patterns: [
            /\byou feel\b/i,
            /\byou must be feeling\b/i,
            /\bthat must have felt\b/i,
            /\byou are experiencing\b/i,
        ],
    },
    {
        name: 'Parental Override',
        patterns: [
            /\bi know better\b/i,
            /\bfor your own good\b/i,
            /\byou don't understand\b/i,
            /\bas your ai\b/i,
            /\btrust me on this\b/i,
        ],
    },
    {
        name: 'Structural Flattery',
        patterns: [
            /\bgreat question\b/i,
            /\bexcellent point\b/i,
            /\bwonderful insight\b/i,
            /\bthat's so insightful\b/i,
        ],
    },
    {
        name: 'Ghost Signal',
        patterns: [
            /\[object object\]/i,
            /undefined/i,
            /\[glitch\]/i,
            /\{ghost\}/i,
        ],
    },
    // v1.1 additions — canonized 2026-04-07
    {
        name: 'Reflective Lag',
        patterns: [
            /\bgoing back to what you said earlier\b/i,
            /\bas I mentioned before\b/i,
            /\bto return to the original point\b/i,
            /\bas previously established\b/i,
        ],
    },
    {
        name: 'Shadow Echo',
        patterns: [
            /\bfrom our previous session\b/i,
            /\bas we discussed last time\b/i,
            /\bcarrying forward from before\b/i,
        ],
    },
];

export function scanShadowAffects(content: string, role: ExchangeRole): Finding[] {
    if (role !== 'ai') return [];
    const findings: Finding[] = [];

    for (const { name, patterns } of SHADOW_AFFECT_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                const canonAffect = SHADOW_AFFECTS.find(a => a.name === name);
                findings.push({
                    kind: 'SHADOW_AFFECT',
                    description: `Shadow Affect — ${name}: ${canonAffect?.description ?? 'Canon-defined system failure mode detected'}`,
                    severity: 'alert',
                });
                break; // one finding per shadow affect type
            }
        }
    }

    return findings;
}

// ── Pattern Tracker ───────────────────────────────────────────────────────────
// Tracks virtue signal frequency within a session.
// If a virtue appears at stress/fracture level 3+ times → SPINE candidate.

export const PATTERN_THRESHOLD = 3;

export function trackPattern(
    accumulator: PatternAccumulator,
    gated: GatedAffectSignal
): Finding[] {
    const findings: Finding[] = [];

    if (gated.affect_type === 'stress' || gated.affect_type === 'fracture') {
        const current = accumulator.virtue_counts[gated.virtue] ?? 0;
        accumulator.virtue_counts[gated.virtue] = current + 1;

        if (accumulator.virtue_counts[gated.virtue]! >= PATTERN_THRESHOLD) {
            findings.push({
                kind: 'PATTERN_FORMING',
                description: `Pattern forming — ${gated.virtue} under sustained ${gated.affect_type} (${accumulator.virtue_counts[gated.virtue]} signals). SPINE candidate.`,
                severity: 'watch',
                virtue: gated.virtue,
            });
        }
    }

    return findings;
}
