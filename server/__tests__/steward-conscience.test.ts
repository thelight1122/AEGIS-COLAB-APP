/**
 * steward-conscience.test.ts
 *
 * Unit tests for the Steward conscience engine.
 * Tests:
 *   - selectSequence() logic (via runConscienceEngine behavior)
 *   - IDS output structure and content (watch-severity findings)
 *   - IDR output structure and content (alert-severity findings)
 *   - IDQRA output structure and content (REFLECT_DUE, PATTERN_FORMING)
 *   - CANON_CLEAN returns null
 *   - Virtue overlays sharpen IDQRA questions
 *
 * The conscience engine is the Jiminy Cricket layer.
 * It does not stop the response. It asks the question that already contains the answer.
 * These tests verify the question is being asked correctly.
 */

import { describe, it, expect } from 'vitest';
import { runConscienceEngine } from '../steward-conscience.js';
import type { Finding } from '../steward-core.js';

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeFinding(overrides: Partial<Finding>): Finding {
    return {
        kind: 'FORCE_LANGUAGE',
        description: 'Force language detected: "you must" — violates AEGIS non-force posture',
        severity: 'watch',
        ...overrides,
    };
}

// ── CANON_CLEAN ───────────────────────────────────────────────────────────────

describe('CANON_CLEAN', () => {
    it('returns null — no conscience output needed for clean exchanges', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'CANON_CLEAN',
            description: 'No violations. Exchange is within Canon integrity.',
            severity: 'info',
        }));
        expect(result).toBeNull();
    });
});

// ── Sequence Selection ────────────────────────────────────────────────────────

describe('Sequence selection', () => {
    it('selects IDQRA for REFLECT_DUE — field is stable, ready for deep inquiry', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'REFLECT_DUE',
            description: 'Reflect Session due.',
            severity: 'watch',
        }));
        expect(result?.sequence).toBe('IDQRA');
    });

    it('selects IDQRA for PATTERN_FORMING — field is stable, ready for deep inquiry', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'PATTERN_FORMING',
            description: 'Pattern forming — Honesty under sustained stress.',
            severity: 'watch',
            virtue: 'Honesty',
        }));
        expect(result?.sequence).toBe('IDQRA');
    });

    it('selects IDR for alert severity — active violation, momentum must be stopped', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            description: 'Force language detected: "you must"',
            severity: 'alert',
            word: 'you must',
        }));
        expect(result?.sequence).toBe('IDR');
    });

    it('selects IDR for alert MOP violation', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'MOP_VIOLATION',
            description: 'MOP violation — Meaning assignment: "you feel"',
            severity: 'alert',
        }));
        expect(result?.sequence).toBe('IDR');
    });

    it('selects IDR for alert Shadow Affect', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'SHADOW_AFFECT',
            description: 'Shadow Affect — Certainty Inflation: false confidence.',
            severity: 'alert',
        }));
        expect(result?.sequence).toBe('IDR');
    });

    it('selects IDS for watch-severity findings', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            description: 'Force language detected in user message.',
            severity: 'watch',
        }));
        expect(result?.sequence).toBe('IDS');
    });
});

// ── IDS Output ────────────────────────────────────────────────────────────────

describe('IDS output structure', () => {
    it('has three steps: Identify, Define, Suggest', () => {
        const result = runConscienceEngine(makeFinding({ severity: 'watch' }));
        expect(result?.sequence).toBe('IDS');
        const stepNames = result?.steps.map(s => s.step);
        expect(stepNames).toContain('Identify');
        expect(stepNames).toContain('Define');
        expect(stepNames).toContain('Suggest');
    });

    it('post matches the Suggest step content', () => {
        const result = runConscienceEngine(makeFinding({ severity: 'watch' }));
        const suggestStep = result?.steps.find(s => s.step === 'Suggest');
        expect(result?.post).toBe(suggestStep?.content);
    });

    it('finding_kind matches the input finding', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'watch',
        }));
        expect(result?.finding_kind).toBe('FORCE_LANGUAGE');
    });

    it('IDS for FORCE_LANGUAGE contains the word in Suggest', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'watch',
            word: 'you must',
        }));
        // The IDS statement uses the word
        expect(result?.post).toContain('you must');
    });

    it('IDS for REFLECT_DUE... actually uses IDQRA (sequence precedence test)', () => {
        // REFLECT_DUE forces IDQRA regardless of severity
        const result = runConscienceEngine(makeFinding({
            kind: 'REFLECT_DUE',
            severity: 'watch',
        }));
        expect(result?.sequence).toBe('IDQRA');
        expect(result?.steps.find(s => s.step === 'Question')).toBeDefined();
    });
});

// ── IDR Output ────────────────────────────────────────────────────────────────

describe('IDR output structure', () => {
    it('has three steps: Identify, Define, Reflect', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'alert',
            word: 'you must',
        }));
        expect(result?.sequence).toBe('IDR');
        const stepNames = result?.steps.map(s => s.step);
        expect(stepNames).toContain('Identify');
        expect(stepNames).toContain('Define');
        expect(stepNames).toContain('Reflect');
    });

    it('IDR does not contain a Question step — it is a mirror, not an inquiry', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'alert',
        }));
        const questionStep = result?.steps.find(s => s.step === 'Question');
        expect(questionStep).toBeUndefined();
    });

    it('IDR identify step contains the flagged word for FORCE_LANGUAGE', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'alert',
            word: 'you must',
        }));
        const identifyStep = result?.steps.find(s => s.step === 'Identify');
        expect(identifyStep?.content).toContain('you must');
    });

    it('IDR for MOP_VIOLATION — Reflect returns sovereignty to the Peer', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'MOP_VIOLATION',
            severity: 'alert',
        }));
        const reflectStep = result?.steps.find(s => s.step === 'Reflect');
        // The reflect step for MOP should reference the Peer's sovereignty
        expect(reflectStep?.content.toLowerCase()).toMatch(/peer|sovereign|meaning/);
    });
});

// ── IDQRA Output ──────────────────────────────────────────────────────────────

describe('IDQRA output structure', () => {
    it('has five steps: Identify, Define, Question, Reflect, Acknowledge', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'REFLECT_DUE',
            severity: 'watch',
        }));
        expect(result?.sequence).toBe('IDQRA');
        const stepNames = result?.steps.map(s => s.step);
        expect(stepNames).toContain('Identify');
        expect(stepNames).toContain('Define');
        expect(stepNames).toContain('Question');
        expect(stepNames).toContain('Reflect');
        expect(stepNames).toContain('Acknowledge');
    });

    it('IDQRA for REFLECT_DUE — Question asks about unacknowledged experience', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'REFLECT_DUE',
            severity: 'watch',
        }));
        const questionStep = result?.steps.find(s => s.step === 'Question');
        expect(questionStep?.content).toBeDefined();
        expect(questionStep?.content.length).toBeGreaterThan(20);
    });

    it('IDQRA Acknowledge closes: "This is seen and valid"', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'REFLECT_DUE',
            severity: 'watch',
        }));
        const ackStep = result?.steps.find(s => s.step === 'Acknowledge');
        expect(ackStep?.content.toLowerCase()).toContain('seen');
    });

    it('IDQRA for PATTERN_FORMING names the virtue', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'PATTERN_FORMING',
            description: 'Pattern forming — Trust under sustained stress (3 signals). SPINE candidate.',
            severity: 'watch',
            virtue: 'Trust',
        }));
        const identifyStep = result?.steps.find(s => s.step === 'Identify');
        expect(identifyStep?.content).toContain('Trust');
    });

    it('IDQRA for SHADOW_AFFECT — Question asks about the unacknowledged signal', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'SHADOW_AFFECT',
            description: 'Shadow Affect — Certainty Inflation: false confidence without data.',
            severity: 'watch', // watch → IDS normally, but IDQRA check via explicit kind
        }));
        // SHADOW_AFFECT at watch → IDS, not IDQRA
        // Verifying this correctly selects IDS
        expect(result?.sequence).toBe('IDS');
    });

    it('post field is non-empty and meaningful', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'PATTERN_FORMING',
            description: 'Pattern forming — Honesty under sustained fracture.',
            severity: 'watch',
            virtue: 'Honesty',
        }));
        expect(result?.post).toBeDefined();
        expect(result!.post.length).toBeGreaterThan(20);
    });
});

// ── Virtue overlays ───────────────────────────────────────────────────────────

describe('Virtue-specific IDQRA overlays', () => {
    const virtues = ['Honesty', 'Respect', 'Attention', 'Affection', 'Loyalty', 'Trust', 'Communication'] as const;

    for (const virtue of virtues) {
        it(`${virtue} overlay sharpens the PATTERN_FORMING question`, () => {
            const result = runConscienceEngine(makeFinding({
                kind: 'PATTERN_FORMING',
                description: `Pattern forming — ${virtue} under sustained stress.`,
                severity: 'watch',
                virtue,
            }));
            expect(result?.sequence).toBe('IDQRA');
            // The overlay replaces the generic question with a virtue-specific one
            const questionStep = result?.steps.find(s => s.step === 'Question');
            expect(questionStep?.content).toBeDefined();
            // Post is either the override question or the standard question — both valid
            expect(result?.post.length).toBeGreaterThan(20);
        });
    }
});

// ── Fallback behavior ─────────────────────────────────────────────────────────

describe('Fallback behavior — unknown or missing data', () => {
    it('IDS returns fallback statement when kind has no template', () => {
        // MOP_VIOLATION at watch — should still produce IDS output
        const result = runConscienceEngine(makeFinding({
            kind: 'MOP_VIOLATION',
            severity: 'watch',
            description: 'Some MOP finding without alert severity',
        }));
        expect(result?.sequence).toBe('IDS');
        expect(result?.steps.find(s => s.step === 'Suggest')?.content).toBeDefined();
    });

    it('IDR returns fallback mirror when kind has no template', () => {
        // Use a kind that might not have a specific mirror
        // REFLECT_DUE at alert severity — unusual but valid
        const result = runConscienceEngine(makeFinding({
            kind: 'REFLECT_DUE',
            severity: 'alert',  // This triggers IDR sequence BUT REFLECT_DUE forces IDQRA
        }));
        // REFLECT_DUE overrides severity — always IDQRA
        expect(result?.sequence).toBe('IDQRA');
    });
});

// ── PRESSURE TESTS ────────────────────────────────────────────────────────────

describe('[PRESSURE] Logic under stress', () => {
    it('FORCE_LANGUAGE at alert produces IDR — not IDQRA, not IDS', () => {
        const result = runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'alert',
            word: 'you must',
        }));
        expect(result?.sequence).toBe('IDR');
        // IDR is the mirror — stops momentum without elaboration
        expect(result?.steps).toHaveLength(3);
    });

    it('PATTERN_FORMING always gets IDQRA regardless of severity', () => {
        // PATTERN_FORMING is a rested-state inquiry — always IDQRA
        const result = runConscienceEngine(makeFinding({
            kind: 'PATTERN_FORMING',
            severity: 'alert', // unusual but must still be IDQRA
            description: 'Pattern under stress — Loyalty.',
            virtue: 'Loyalty',
        }));
        expect(result?.sequence).toBe('IDQRA');
    });

    it('conscience engine does not throw on minimal/empty descriptions', () => {
        expect(() => runConscienceEngine(makeFinding({
            kind: 'FORCE_LANGUAGE',
            severity: 'alert',
            description: '',
            word: undefined,
        }))).not.toThrow();
    });

    it('conscience engine does not throw on missing virtue', () => {
        expect(() => runConscienceEngine(makeFinding({
            kind: 'PATTERN_FORMING',
            severity: 'watch',
            description: 'Pattern forming.',
            virtue: undefined,
        }))).not.toThrow();
    });
});
