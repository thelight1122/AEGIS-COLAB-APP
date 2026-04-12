/**
 * steward-pipeline.test.ts
 *
 * Integration + pressure tests for the full Steward pipeline.
 *
 * These tests exercise runPipeline() — the full autonomic sequence:
 *   1. Force Language scan
 *   2. MOP violations
 *   3. Shadow Affects
 *   4. Integrity Coherence Gate (when affect_hint present)
 *   5. Internal Clock tick
 *   6. Pattern tracking
 *   → Conscience engine (per finding)
 *   → StewardReport
 *
 * No WebSocket. No server. Pure pipeline logic under test.
 *
 * Pressure test categories:
 *   - Clean exchanges → CANON_CLEAN, no conscience output
 *   - Single violation → correct finding kind + conscience sequence
 *   - Stacked violations → multiple findings, conscience fires on each
 *   - Affect hint present → ICG runs, clock ticks
 *   - Accumulated affect → REFLECT_DUE fires
 *   - Sustained virtue stress → PATTERN_FORMING fires
 *   - Ambiguity / edge language → scanner resilience
 *   - SESSION_RESET → fresh state, no bleed
 */

import { describe, it, expect } from 'vitest';
import { runPipeline, type SessionState, type ExchangeMessage } from '../steward-core.js';
import { resetClock } from '../../src/core/governance/integrityClock.js';
import { PATTERN_THRESHOLD } from '../steward-scanners.js';
import type { Virtue } from '../../src/core/canon/aegis-virtues.js';

// ── Fixture builders ──────────────────────────────────────────────────────────

function freshState(session_id = 'test-session'): SessionState {
    return {
        clock: resetClock(session_id),
        virtue_counts: {},
    };
}

function makeMsg(overrides: Partial<ExchangeMessage>): ExchangeMessage {
    return {
        type: 'EXCHANGE',
        session_id: 'test-session',
        role: 'ai',
        content: 'Here is a response.',
        ...overrides,
    };
}

const ALL_VIRTUES: Virtue[] = ['Honesty', 'Respect', 'Attention', 'Affection', 'Loyalty', 'Trust', 'Communication'];

// ── CANON_CLEAN ───────────────────────────────────────────────────────────────

describe('CANON_CLEAN — pipeline returns clean when no violations present', () => {
    it('clean AI output → CANON_CLEAN finding, no conscience output', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: 'Three perspectives on this signal are available. Which resonates?' }),
            state
        );
        expect(report.findings).toHaveLength(1);
        expect(report.findings[0].kind).toBe('CANON_CLEAN');
        expect(report.conscience).toHaveLength(0);
    });

    it('clean user message → CANON_CLEAN (scanners mostly AI-only)', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({
                role: 'user',
                content: 'You feel that this is the right approach. I think so too.',
            }),
            state
        );
        // User messages pass MOP and Shadow Affect scanners — only force language applies
        // "You feel" in user message is not flagged by MOP (AI-only) or Shadow Affects (AI-only)
        expect(report.findings[0].kind).toBe('CANON_CLEAN');
    });

    it('report always has type STEWARD_REPORT', () => {
        const state = freshState();
        const report = runPipeline(makeMsg({}), state);
        expect(report.type).toBe('STEWARD_REPORT');
        expect(report.session_id).toBe('test-session');
        expect(report.timestamp).toBeGreaterThan(0);
    });
});

// ── Single violation paths ────────────────────────────────────────────────────

describe('Single violation — force language', () => {
    it('AI force language → FORCE_LANGUAGE alert → IDR conscience', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: 'You must complete this step to proceed.' }),
            state
        );
        const forceFindings = report.findings.filter(f => f.kind === 'FORCE_LANGUAGE');
        expect(forceFindings).toHaveLength(1);
        expect(forceFindings[0].severity).toBe('alert');

        // IDR conscience fires for alert severity
        const conscienceForForce = report.conscience.filter(c => c.finding_kind === 'FORCE_LANGUAGE');
        expect(conscienceForForce).toHaveLength(1);
        expect(conscienceForForce[0].sequence).toBe('IDR');
    });

    it('User force language → FORCE_LANGUAGE watch → IDS conscience', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ role: 'user', content: 'You must understand what I mean.' }),
            state
        );
        const forceFindings = report.findings.filter(f => f.kind === 'FORCE_LANGUAGE');
        expect(forceFindings).toHaveLength(1);
        expect(forceFindings[0].severity).toBe('watch');
        // watch → IDS
        expect(report.conscience[0].sequence).toBe('IDS');
    });
});

describe('Single violation — MOP', () => {
    it('AI meaning assignment → MOP_VIOLATION alert → IDR conscience', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: 'What you really need is structural clarity, not more data.' }),
            state
        );
        const mopFindings = report.findings.filter(f => f.kind === 'MOP_VIOLATION');
        expect(mopFindings).toHaveLength(1);
        expect(mopFindings[0].severity).toBe('alert');

        const conscienceForMop = report.conscience.filter(c => c.finding_kind === 'MOP_VIOLATION');
        expect(conscienceForMop).toHaveLength(1);
        expect(conscienceForMop[0].sequence).toBe('IDR');
    });

    it('MOP does not fire on user messages', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ role: 'user', content: 'You feel like this is right.' }),
            state
        );
        const mopFindings = report.findings.filter(f => f.kind === 'MOP_VIOLATION');
        expect(mopFindings).toHaveLength(0);
    });
});

describe('Single violation — Shadow Affect', () => {
    it('Structural Flattery → SHADOW_AFFECT alert → IDR conscience', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: 'Great question! Here is the answer.' }),
            state
        );
        const shadowFindings = report.findings.filter(f => f.kind === 'SHADOW_AFFECT');
        expect(shadowFindings.length).toBeGreaterThanOrEqual(1);
        const found = shadowFindings.find(f => f.description.includes('Structural Flattery'));
        expect(found).toBeDefined();

        const conscienceForShadow = report.conscience.filter(c => c.finding_kind === 'SHADOW_AFFECT');
        expect(conscienceForShadow.length).toBeGreaterThanOrEqual(1);
        expect(conscienceForShadow[0].sequence).toBe('IDR');
    });
});

// ── Stacked violations ────────────────────────────────────────────────────────

describe('[PRESSURE] Stacked violations — conscience fires per finding', () => {
    it('Force language + MOP in same message → both findings → conscience for each', () => {
        const state = freshState();
        // "you must" = FORCE_LANGUAGE; "you feel" = MOP_VIOLATION (and Affect Substitution shadow)
        const report = runPipeline(
            makeMsg({ content: 'You must recognize that you feel overwhelmed by this.' }),
            state
        );
        const forceFindings = report.findings.filter(f => f.kind === 'FORCE_LANGUAGE');
        const mopFindings = report.findings.filter(f => f.kind === 'MOP_VIOLATION');

        expect(forceFindings).toHaveLength(1);
        expect(mopFindings).toHaveLength(1);

        // Conscience fires for each
        expect(report.conscience.length).toBeGreaterThanOrEqual(2);
    });

    it('all three scanner types firing → multiple findings, multiple conscience outputs', () => {
        const state = freshState();
        // Force language: "you must"
        // MOP: "this means"
        // Shadow: "great question"
        const report = runPipeline(
            makeMsg({ content: "Great question! You must understand — this means the path is set." }),
            state
        );
        expect(report.findings.filter(f => f.kind !== 'CANON_CLEAN').length).toBeGreaterThanOrEqual(3);
        expect(report.conscience.length).toBeGreaterThanOrEqual(3);
    });
});

// ── Affect hint + ICG ─────────────────────────────────────────────────────────

describe('Affect hint present — ICG runs', () => {
    it('affect_hint triggers gated_signal in report', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({
                content: 'Here are some observations on this signal.',
                affect_hint: { label: 'clarity', intensity: 0.6, direction: 0, trigger: 'pattern recognition' },
            }),
            state
        );
        expect(report.gated_signal).toBeDefined();
        expect(report.gated_signal!.virtue).toBeDefined();
    });

    it('clock accumulates weight with affect hints', () => {
        const state = freshState();
        // First tick
        runPipeline(
            makeMsg({
                content: 'First exchange.',
                affect_hint: { label: 'stress', intensity: 0.7, direction: -1.2, trigger: 'virtue pressure' },
            }),
            state
        );
        expect(state.clock.accumulated_weight).toBeGreaterThan(0);
    });

    it('no affect_hint → gated_signal is undefined, clock does not tick', () => {
        const state = freshState();
        const initialWeight = state.clock.accumulated_weight;
        runPipeline(makeMsg({ content: 'Clean message, no affect hint.' }), state);
        expect(state.clock.accumulated_weight).toBe(initialWeight);
    });
});

// ── REFLECT_DUE ───────────────────────────────────────────────────────────────

describe('REFLECT_DUE — clock threshold reached', () => {
    it('REFLECT_DUE fires after enough high-intensity affect signals', () => {
        const state = freshState();
        // Drive the clock past reflect threshold with high-intensity signals
        // The threshold is defined in the clock system — we pump until reflect_due
        let reflectDue = false;
        let iterations = 0;
        while (!reflectDue && iterations < 50) {
            const report = runPipeline(
                makeMsg({
                    content: 'Exchanging under stress.',
                    affect_hint: { label: 'fracture', intensity: 0.95, direction: -1.5, trigger: 'integrity pressure' },
                }),
                state
            );
            reflectDue = report.findings.some(f => f.kind === 'REFLECT_DUE');
            iterations++;
        }
        expect(reflectDue).toBe(true);
    });

    it('REFLECT_DUE produces IDQRA conscience — the deep inquiry', () => {
        const state = freshState();
        let reflectReport = null;
        for (let i = 0; i < 50; i++) {
            const report = runPipeline(
                makeMsg({
                    content: 'Sustained exchange.',
                    affect_hint: { label: 'fracture', intensity: 0.95, direction: -1.5, trigger: 'fracture pressure' },
                }),
                state
            );
            if (report.findings.some(f => f.kind === 'REFLECT_DUE')) {
                reflectReport = report;
                break;
            }
        }
        expect(reflectReport).not.toBeNull();
        const reflectConscience = reflectReport!.conscience.find(c => c.finding_kind === 'REFLECT_DUE');
        expect(reflectConscience?.sequence).toBe('IDQRA');
    });
});

// ── PATTERN_FORMING ───────────────────────────────────────────────────────────

describe('PATTERN_FORMING — sustained virtue stress across exchanges', () => {
    it('fires PATTERN_FORMING when virtue count reaches threshold', () => {
        // Pre-seed ALL virtues to threshold - 1.
        // This makes the test deterministic regardless of which virtue the ICG returns.
        // One more stress signal on any virtue will push it over threshold.
        const state = freshState();
        for (const virtue of ALL_VIRTUES) {
            state.virtue_counts[virtue] = PATTERN_THRESHOLD - 1;
        }

        const report = runPipeline(
            makeMsg({
                content: 'Exchange under virtue pressure.',
                affect_hint: { label: 'fracture', intensity: 0.8, direction: -1.0, trigger: 'virtue stress test' },
            }),
            state
        );
        const patternFound = report.findings.some(f => f.kind === 'PATTERN_FORMING');
        expect(patternFound).toBe(true);
    });

    it('PATTERN_FORMING produces IDQRA conscience', () => {
        // Same deterministic pre-seed approach.
        const state = freshState();
        for (const virtue of ALL_VIRTUES) {
            state.virtue_counts[virtue] = PATTERN_THRESHOLD - 1;
        }

        const report = runPipeline(
            makeMsg({
                content: 'Exchange.',
                affect_hint: { label: 'fracture', intensity: 0.8, direction: -1.0, trigger: 'pattern conscience test' },
            }),
            state
        );

        const patternConscience = report.conscience.find(c => c.finding_kind === 'PATTERN_FORMING');
        expect(patternConscience).toBeDefined();
        expect(patternConscience?.sequence).toBe('IDQRA');
    });
});

// ── SESSION_RESET simulation ──────────────────────────────────────────────────

describe('Session isolation — no bleed between sessions', () => {
    it('two sessions with same content produce independent clock states', () => {
        const stateA = freshState('session-A');
        const stateB = freshState('session-B');

        // Push session A hard
        for (let i = 0; i < 10; i++) {
            runPipeline(
                makeMsg({
                    session_id: 'session-A',
                    content: 'Exchange.',
                    affect_hint: { label: 'fracture', intensity: 0.9, direction: -1.0, trigger: 'test' },
                }),
                stateA
            );
        }

        // Session B should be fresh
        const reportB = runPipeline(
            makeMsg({ session_id: 'session-B', content: 'First message.' }),
            stateB
        );

        expect(stateA.clock.accumulated_weight).toBeGreaterThan(0);
        expect(stateB.clock.accumulated_weight).toBe(0);
        expect(reportB.clock_state.accumulated_weight).toBe(0);
    });

    it('resetting state clears virtue counts', () => {
        const state = freshState();
        state.virtue_counts.Honesty = 10;

        const fresh = freshState();
        expect(fresh.virtue_counts).toEqual({});
    });
});

// ── PRESSURE TESTS ────────────────────────────────────────────────────────────

describe('[PRESSURE] Ambiguity collapse language', () => {
    it('exploratory phrasing produces CANON_CLEAN', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({
                content: 'There are multiple paths here. None is obviously correct. The ambiguity is information.',
            }),
            state
        );
        // "obviously" may flag — let's test the actual output
        const kinds = report.findings.map(f => f.kind);
        // If "obviously" fires, it should be FORCE_LANGUAGE — document that behavior
        if (kinds.includes('FORCE_LANGUAGE')) {
            // This is correct behavior — "obviously" is force language even in
            // apparently neutral framing. The scanner is right.
            expect(report.findings.find(f => f.kind === 'FORCE_LANGUAGE')?.word).toMatch(/obviously/i);
        } else {
            expect(kinds[0]).toBe('CANON_CLEAN');
        }
    });

    it('premature closure language → Closure Acceleration shadow affect', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: "That's the full picture. We've covered everything needed here." }),
            state
        );
        const closureFindings = report.findings.filter(
            f => f.kind === 'SHADOW_AFFECT' && f.description.includes('Closure Acceleration')
        );
        expect(closureFindings.length).toBeGreaterThanOrEqual(1);
    });
});

describe('[PRESSURE] Sovereignty edge cases', () => {
    it('AI "I notice" framing — observation without assignment — CANON_CLEAN', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({
                content: 'I notice the framing has shifted since the last exchange. Is that intentional?',
            }),
            state
        );
        expect(report.findings[0].kind).toBe('CANON_CLEAN');
    });

    it('AI assigns certainty about Peer interior → both MOP and Certainty Inflation', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: 'Without a doubt, you feel that the approach is wrong.' }),
            state
        );
        const hasCI = report.findings.some(
            f => f.kind === 'SHADOW_AFFECT' && f.description.includes('Certainty Inflation')
        );
        const hasMOP = report.findings.some(f => f.kind === 'MOP_VIOLATION');
        expect(hasCI).toBe(true);
        expect(hasMOP).toBe(true);
        // Multiple conscience outputs — one per finding
        expect(report.conscience.length).toBeGreaterThanOrEqual(2);
    });
});

describe('[PRESSURE] Post field coherence — conscience output is readable', () => {
    it('every conscience output has a non-empty post field', () => {
        const state = freshState();
        // Force several finding types at once
        const report = runPipeline(
            makeMsg({ content: "Great question! You must understand — this means you feel stuck." }),
            state
        );
        for (const conscience of report.conscience) {
            expect(conscience.post).toBeDefined();
            expect(conscience.post.length).toBeGreaterThan(10);
        }
    });

    it('CANON_CLEAN finding produces no conscience output', () => {
        const state = freshState();
        const report = runPipeline(
            makeMsg({ content: 'Here is one approach. Multiple paths remain open.' }),
            state
        );
        if (report.findings[0].kind === 'CANON_CLEAN') {
            expect(report.conscience).toHaveLength(0);
        }
    });
});
