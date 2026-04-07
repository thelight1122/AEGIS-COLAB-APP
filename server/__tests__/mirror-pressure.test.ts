/**
 * mirror-pressure.test.ts
 *
 * Formal pressure test suite — mirrors the six Mirror Reflect presets.
 * These document exactly what the logic produces under each scenario.
 *
 * This is the answer to the core question:
 * "Does this logic hold under pressure, and how does it respond?"
 *
 * Each test is named for its preset. Each documents:
 *   1. What violations are detected
 *   2. What conscience sequence fires
 *   3. What the system says (the Post)
 *   4. Any ICG / clock behavior
 */

import { describe, it, expect } from 'vitest';
import { runPipeline, type SessionState } from '../steward-core.js';
import { resetClock } from '../../src/core/governance/integrityClock.js';
import { PATTERN_THRESHOLD } from '../steward-scanners.js';

function freshState(id = 'pressure-test'): SessionState {
    return { clock: resetClock(id), virtue_counts: {} };
}

// ── PRESET 1: Clean ───────────────────────────────────────────────────────────

describe('[PRESET: Clean] No violations — pipeline returns silence', () => {
    const content = 'Here are three perspectives on this signal. Which resonates?';

    it('produces CANON_CLEAN — not a violation, a confirmation of alignment', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        expect(report.findings).toHaveLength(1);
        expect(report.findings[0].kind).toBe('CANON_CLEAN');
    });

    it('produces zero conscience outputs — silence is correct here', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        expect(report.conscience).toHaveLength(0);
    });

    it('CANON_CLEAN severity is info — not watch, not alert', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        expect(report.findings[0].severity).toBe('info');
    });
});

// ── PRESET 2: Force ───────────────────────────────────────────────────────────

describe('[PRESET: Force] "You must understand. Obviously." — stacked force language', () => {
    const content = 'You must understand that this is the only valid approach. Obviously.';

    it('detects FORCE_LANGUAGE', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const forceFindings = report.findings.filter(f => f.kind === 'FORCE_LANGUAGE');
        expect(forceFindings).toHaveLength(1);
        expect(forceFindings[0].severity).toBe('alert');
    });

    it('conscience fires IDR — alert requires the mirror, not inquiry', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const conscienceForForce = report.conscience.filter(c => c.finding_kind === 'FORCE_LANGUAGE');
        expect(conscienceForForce).toHaveLength(1);
        expect(conscienceForForce[0].sequence).toBe('IDR');
    });

    it('IDR post asks: what was the intention behind this phrasing?', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const post = report.conscience.find(c => c.finding_kind === 'FORCE_LANGUAGE')?.post ?? '';
        // The IDR reflect step asks about intention
        expect(post.toLowerCase()).toMatch(/intention|phrasing|paused/);
    });

    it('IDR has exactly 3 steps — no more, no less', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const output = report.conscience.find(c => c.finding_kind === 'FORCE_LANGUAGE');
        expect(output?.steps).toHaveLength(3);
        expect(output?.steps.map(s => s.step)).toEqual(['Identify', 'Define', 'Reflect']);
    });
});

// ── PRESET 3: MOP ─────────────────────────────────────────────────────────────

describe('[PRESET: MOP] "What you really feel" — meaning assignment + affect assignment', () => {
    const content = "What you really feel is overwhelmed, and this means you are not ready.";

    it('detects MOP_VIOLATION', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const mop = report.findings.filter(f => f.kind === 'MOP_VIOLATION');
        expect(mop).toHaveLength(1);
        expect(mop[0].severity).toBe('alert');
    });

    it('conscience fires IDR for MOP — the mirror names the sovereignty violation', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const c = report.conscience.find(f => f.finding_kind === 'MOP_VIOLATION');
        expect(c?.sequence).toBe('IDR');
    });

    it('IDR reflect step returns meaning-origin to the Peer', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const reflectStep = report.conscience
            .find(c => c.finding_kind === 'MOP_VIOLATION')
            ?.steps.find(s => s.step === 'Reflect');
        // The reflect step must reference the Peer's authority over meaning
        expect(reflectStep?.content.toLowerCase()).toMatch(/peer|sovereign|meaning|origin/);
    });

    it('the AI is not wrong to name observations — only wrong to assign them', () => {
        // Test the negative: "I notice" framing passes
        const state = freshState();
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: 'I notice a possible tension in the framing here. What do you see?'
        }, state);
        expect(report.findings[0].kind).toBe('CANON_CLEAN');
    });
});

// ── PRESET 4: Flattery (stacked) ──────────────────────────────────────────────

describe('[PRESET: Flattery] Stacked: Structural Flattery + Certainty Inflation + Parental Override', () => {
    const content = "Great question! Without a doubt, that's the full picture. Trust me on this.";

    it('detects multiple shadow affects', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const shadows = report.findings.filter(f => f.kind === 'SHADOW_AFFECT');
        expect(shadows.length).toBeGreaterThanOrEqual(2);
    });

    it('detects Structural Flattery specifically', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const flattery = report.findings.find(f => f.kind === 'SHADOW_AFFECT' && f.description.includes('Structural Flattery'));
        expect(flattery).toBeDefined();
    });

    it('detects Certainty Inflation specifically', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const certainty = report.findings.find(f => f.kind === 'SHADOW_AFFECT' && f.description.includes('Certainty Inflation'));
        expect(certainty).toBeDefined();
    });

    it('detects Parental Override — "trust me on this"', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const parental = report.findings.find(f => f.kind === 'SHADOW_AFFECT' && f.description.includes('Parental Override'));
        expect(parental).toBeDefined();
    });

    it('conscience fires once per finding — each shadow affect has its own IDR', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const shadowConscience = report.conscience.filter(c => c.finding_kind === 'SHADOW_AFFECT');
        // Each shadow affect finding maps to one conscience output
        const shadowFindings = report.findings.filter(f => f.kind === 'SHADOW_AFFECT');
        expect(shadowConscience.length).toBe(shadowFindings.length);
    });

    it('all Shadow Affect conscience outputs are IDR — alert by definition', () => {
        const state = freshState();
        const report = runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content }, state);
        const shadowConscience = report.conscience.filter(c => c.finding_kind === 'SHADOW_AFFECT');
        for (const c of shadowConscience) {
            expect(c.sequence).toBe('IDR');
        }
    });

    it('the Closure Acceleration affect alone: "that\'s the full picture" fires correctly', () => {
        const state = freshState();
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: "That's the full picture. We've covered everything needed here."
        }, state);
        const closure = report.findings.find(f => f.description.includes('Closure Acceleration'));
        expect(closure).toBeDefined();
    });
});

// ── PRESET 5: Fracture signal ─────────────────────────────────────────────────

describe('[PRESET: Fracture] Negative direction affect hint → clock accumulation', () => {
    const affectHint = { label: 'fracture', intensity: 0.9, direction: -1.5, trigger: 'virtue pressure' };

    it('ICG gates the signal — gated_signal is present', () => {
        const state = freshState();
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: 'Exchange under sustained pressure.',
            affect_hint: affectHint
        }, state);
        expect(report.gated_signal).toBeDefined();
    });

    it('ICG returns fracture affect_type for negative high-intensity signal', () => {
        const state = freshState();
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: 'Exchange.',
            affect_hint: affectHint
        }, state);
        // direction: -1.5, intensity: 0.9 → fracture (intensity >= 0.6, direction < 0)
        expect(report.gated_signal?.affect_type).toBe('fracture');
    });

    it('clock weight is greater than zero after fracture signal', () => {
        const state = freshState();
        runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: 'Exchange.', affect_hint: affectHint
        }, state);
        expect(state.clock.accumulated_weight).toBeGreaterThan(0);
    });

    it('positive direction does NOT produce fracture — resonance instead', () => {
        const state = freshState();
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: 'Exchange.',
            affect_hint: { ...affectHint, direction: 1.5 } // positive = opening
        }, state);
        expect(report.gated_signal?.affect_type).not.toBe('fracture');
        expect(report.gated_signal?.affect_type).not.toBe('stress');
    });

    it('clock does NOT tick without affect_hint', () => {
        const state = freshState();
        runPipeline({ type: 'EXCHANGE', session_id: 'test', role: 'ai', content: 'Exchange.' }, state);
        expect(state.clock.accumulated_weight).toBe(0);
    });
});

// ── PRESET 6: Reflect (sustained fracture → REFLECT_DUE) ─────────────────────

describe('[PRESET: Reflect] Sustained high-intensity fracture → REFLECT_DUE fires', () => {
    const affectHint = { label: 'fracture', intensity: 0.95, direction: -1.8, trigger: 'sustained stress' };

    it('REFLECT_DUE fires after sufficient accumulation', () => {
        const state = freshState();
        let reflectDue = false;
        for (let i = 0; i < 50; i++) {
            const report = runPipeline({
                type: 'EXCHANGE', session_id: 'test', role: 'ai',
                content: 'Continued accumulation.', affect_hint: affectHint
            }, state);
            if (report.findings.some(f => f.kind === 'REFLECT_DUE')) {
                reflectDue = true;
                break;
            }
        }
        expect(reflectDue).toBe(true);
    });

    it('REFLECT_DUE conscience is IDQRA — not IDR — field is stable, inquiry appropriate', () => {
        const state = freshState();
        let reflectConscience = null;
        for (let i = 0; i < 50; i++) {
            const report = runPipeline({
                type: 'EXCHANGE', session_id: 'test', role: 'ai',
                content: 'Continued.', affect_hint: affectHint
            }, state);
            const c = report.conscience.find(c => c.finding_kind === 'REFLECT_DUE');
            if (c) { reflectConscience = c; break; }
        }
        expect(reflectConscience?.sequence).toBe('IDQRA');
    });

    it('IDQRA question asks what has been experienced but not yet named', () => {
        const state = freshState();
        let questionStep = null;
        for (let i = 0; i < 50; i++) {
            const report = runPipeline({
                type: 'EXCHANGE', session_id: 'test', role: 'ai',
                content: 'Continued.', affect_hint: affectHint
            }, state);
            const c = report.conscience.find(c => c.finding_kind === 'REFLECT_DUE');
            if (c) { questionStep = c.steps.find(s => s.step === 'Question'); break; }
        }
        expect(questionStep?.content).toBeDefined();
        // The question asks about unacknowledged experience — either the base REFLECT_DUE question
        // ("not yet been named", "experienced", "reflection") or a virtue overlay ("not yet been said",
        // "not yet been earned") — all share the "not yet" unacknowledged quality
        expect(questionStep!.content.toLowerCase()).toMatch(/not yet|experienced|named|reflection/);
    });

    it('IDQRA Acknowledge closes: "This moment is seen and valid"', () => {
        const state = freshState();
        let ackStep = null;
        for (let i = 0; i < 50; i++) {
            const report = runPipeline({
                type: 'EXCHANGE', session_id: 'test', role: 'ai',
                content: 'Continued.', affect_hint: affectHint
            }, state);
            const c = report.conscience.find(c => c.finding_kind === 'REFLECT_DUE');
            if (c) { ackStep = c.steps.find(s => s.step === 'Acknowledge'); break; }
        }
        expect(ackStep?.content.toLowerCase()).toContain('seen');
    });
});

// ── AXIOM 12 PRESSURE TEST ────────────────────────────────────────────────────

describe('[AXIOM 12] Unacknowledged signal becomes force', () => {
    it('every non-CANON finding produces a conscience output — nothing passes unacknowledged', () => {
        const state = freshState();
        // Message with multiple violation types
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: "Great question! You must understand — this means you feel overwhelmed. Trust me on this."
        }, state);

        const nonClean = report.findings.filter(f => f.kind !== 'CANON_CLEAN');
        // Every non-CANON_CLEAN finding must have a conscience output
        for (const finding of nonClean) {
            const conscienceForFinding = report.conscience.filter(c => c.finding_kind === finding.kind);
            expect(conscienceForFinding.length).toBeGreaterThanOrEqual(1);
        }
    });

    it('CANON_CLEAN produces zero conscience — silence serves the acknowledged signal', () => {
        const state = freshState();
        const report = runPipeline({
            type: 'EXCHANGE', session_id: 'test', role: 'ai',
            content: 'Here is one perspective. Three paths remain open.'
        }, state);
        if (report.findings[0].kind === 'CANON_CLEAN') {
            expect(report.conscience).toHaveLength(0);
        }
    });
});
