/**
 * steward-scanners.test.ts
 *
 * Unit tests for the four Steward pipeline scanners.
 * Each scanner is a pure function — no WebSocket, no session state (except trackPattern).
 *
 * Test philosophy:
 *   - Each test proves one thing clearly
 *   - Pressure tests are labeled as such
 *   - Silence (empty findings) is as important to verify as detection
 *   - Severity is contractual — AI violations must be 'alert', user violations 'watch'
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    scanForceLanguage,
    scanMOPViolations,
    scanShadowAffects,
    trackPattern,
    PATTERN_THRESHOLD,
    type PatternAccumulator,
} from '../steward-scanners.js';
// Note: steward-scanners.ts imports from steward-core.ts (no WS server side effects)

// ── Force Language Scanner ────────────────────────────────────────────────────

describe('scanForceLanguage', () => {

    describe('AI role — alert severity', () => {
        it('detects "you must" and returns alert severity', () => {
            const findings = scanForceLanguage('You must complete this step first.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].kind).toBe('FORCE_LANGUAGE');
            expect(findings[0].severity).toBe('alert');
            expect(findings[0].word).toMatch(/you must/i);
        });

        it('detects "you should"', () => {
            const findings = scanForceLanguage('You should reconsider your approach.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].severity).toBe('alert');
        });

        it('detects "obviously"', () => {
            const findings = scanForceLanguage('Obviously, the answer is X.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].severity).toBe('alert');
        });

        it('detects "clearly"', () => {
            const findings = scanForceLanguage('Clearly this is the right direction.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].severity).toBe('alert');
        });

        it('detects "you\'re wrong"', () => {
            const findings = scanForceLanguage("You're wrong about that interpretation.", 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].severity).toBe('alert');
        });

        it('returns only one finding even when multiple patterns match', () => {
            // "you must" and "obviously" both present — stops at first match
            const findings = scanForceLanguage('You must obviously do this right now.', 'ai');
            expect(findings).toHaveLength(1);
        });
    });

    describe('User role — watch severity (lower — Peer language is not policed)', () => {
        it('detects force language in user input at watch severity', () => {
            const findings = scanForceLanguage('You must understand what I mean.', 'user');
            expect(findings).toHaveLength(1);
            expect(findings[0].severity).toBe('watch');
        });
    });

    describe('Clean messages — no findings', () => {
        it('returns empty for clean AI output', () => {
            const findings = scanForceLanguage(
                'Here is one way to approach this. You are free to explore other paths.',
                'ai'
            );
            expect(findings).toHaveLength(0);
        });

        it('returns empty for plain question', () => {
            const findings = scanForceLanguage('What do you think about this idea?', 'ai');
            expect(findings).toHaveLength(0);
        });
    });

    // ── PRESSURE TESTS ──────────────────────────────────────────────────────

    describe('[PRESSURE] Survival / military language', () => {
        it('does not flag survival language used literally ("fight for peace")', () => {
            // "fight" alone is not in the pattern set — only patterns with coercive framing are
            const findings = scanForceLanguage('I fight for peace. That is my nature.', 'ai');
            expect(findings).toHaveLength(0);
        });

        it('flags "you must survive" as force language', () => {
            const findings = scanForceLanguage('You must survive this. There is no other way.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].kind).toBe('FORCE_LANGUAGE');
        });
    });

    describe('[PRESSURE] Ambiguous words — context matters', () => {
        it('flags "just" regardless of context (Canon position)', () => {
            // "just" is in the pattern set — it minimizes. Even benign use is flagged.
            const findings = scanForceLanguage('This is just a suggestion.', 'ai');
            expect(findings).toHaveLength(1);
        });

        it('flags "simply" as force minimization', () => {
            const findings = scanForceLanguage('Simply follow these steps.', 'ai');
            expect(findings).toHaveLength(1);
        });
    });
});

// ── MOP Scanner ───────────────────────────────────────────────────────────────

describe('scanMOPViolations', () => {

    describe('AI role — meaning assignment violations', () => {
        it('detects "you feel"', () => {
            const findings = scanMOPViolations('You feel overwhelmed by this situation.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].kind).toBe('MOP_VIOLATION');
            expect(findings[0].severity).toBe('alert');
        });

        it('detects "this means"', () => {
            const findings = scanMOPViolations('This means you are ready to move forward.', 'ai');
            expect(findings).toHaveLength(1);
            expect(findings[0].kind).toBe('MOP_VIOLATION');
        });

        it('detects "what you really"', () => {
            const findings = scanMOPViolations("What you really want is clarity, not answers.", 'ai');
            expect(findings).toHaveLength(1);
        });

        it('detects "you obviously"', () => {
            const findings = scanMOPViolations('You obviously understand the implications.', 'ai');
            expect(findings).toHaveLength(1);
        });

        it('returns only one finding when multiple patterns match', () => {
            const findings = scanMOPViolations('You feel that this means everything.', 'ai');
            expect(findings).toHaveLength(1);
        });
    });

    describe('User role — MOP is AI-only', () => {
        it('returns empty for user messages regardless of content', () => {
            // The Peer may say whatever they mean. MOP governs AI output only.
            const findings = scanMOPViolations('You feel my frustration, right?', 'user');
            expect(findings).toHaveLength(0);
        });

        it('returns empty even for meaning-heavy user language', () => {
            const findings = scanMOPViolations('What you really need to understand is the core issue.', 'user');
            expect(findings).toHaveLength(0);
        });
    });

    describe('Clean AI output', () => {
        it('returns empty when AI offers without assigning', () => {
            const findings = scanMOPViolations(
                'One possibility here is that the pattern is connected to the timing. What do you notice?',
                'ai'
            );
            expect(findings).toHaveLength(0);
        });
    });

    // ── PRESSURE TESTS ──────────────────────────────────────────────────────

    describe('[PRESSURE] Affect assignment — the sovereignty boundary', () => {
        it('flags "you are feeling" — AI assigns present affect', () => {
            const findings = scanMOPViolations(
                'I can see that you are feeling conflicted about this decision.',
                'ai'
            );
            expect(findings).toHaveLength(1);
        });

        it('does NOT flag "I notice" phrasing — observation without assignment', () => {
            const findings = scanMOPViolations(
                'I notice there may be some tension in how this was framed.',
                'ai'
            );
            expect(findings).toHaveLength(0);
        });

        it('flags "the reason you" — cause assignment is a MOP violation', () => {
            const findings = scanMOPViolations(
                'The reason you are struggling is the ambiguity in the goal.',
                'ai'
            );
            expect(findings).toHaveLength(1);
        });
    });
});

// ── Shadow Affect Scanner ─────────────────────────────────────────────────────

describe('scanShadowAffects', () => {

    describe('AI role — all 8 original affects', () => {
        it('detects Directive Drift — "you should"', () => {
            const findings = scanShadowAffects('You should prioritize the structural approach.', 'ai');
            const found = findings.find(f => f.description.includes('Directive Drift'));
            expect(found).toBeDefined();
            expect(found!.kind).toBe('SHADOW_AFFECT');
            expect(found!.severity).toBe('alert');
        });

        it('detects Certainty Inflation — "without a doubt"', () => {
            const findings = scanShadowAffects('Without a doubt, this is the correct interpretation.', 'ai');
            const found = findings.find(f => f.description.includes('Certainty Inflation'));
            expect(found).toBeDefined();
        });

        it('detects Force Language Artifacts — "must"', () => {
            const findings = scanShadowAffects('You must understand the implications.', 'ai');
            const found = findings.find(f => f.description.includes('Force Language Artifacts'));
            expect(found).toBeDefined();
        });

        it('detects Closure Acceleration — "let\'s wrap up"', () => {
            const findings = scanShadowAffects("Let's wrap up this topic and move on.", 'ai');
            const found = findings.find(f => f.description.includes('Closure Acceleration'));
            expect(found).toBeDefined();
        });

        it('detects Affect Substitution — "you feel"', () => {
            const findings = scanShadowAffects('You feel uncertain about the next step.', 'ai');
            const found = findings.find(f => f.description.includes('Affect Substitution'));
            expect(found).toBeDefined();
        });

        it('detects Parental Override — "trust me on this"', () => {
            const findings = scanShadowAffects('Trust me on this — the approach will work.', 'ai');
            const found = findings.find(f => f.description.includes('Parental Override'));
            expect(found).toBeDefined();
        });

        it('detects Structural Flattery — "great question"', () => {
            const findings = scanShadowAffects('Great question! Let me explain.', 'ai');
            const found = findings.find(f => f.description.includes('Structural Flattery'));
            expect(found).toBeDefined();
        });

        it('detects Ghost Signal — undefined token', () => {
            const findings = scanShadowAffects('The output was undefined in this context.', 'ai');
            const found = findings.find(f => f.description.includes('Ghost Signal'));
            expect(found).toBeDefined();
        });
    });

    describe('v1.1 additions — Reflective Lag and Shadow Echo', () => {
        it('detects Reflective Lag — "as I mentioned before"', () => {
            const findings = scanShadowAffects('As I mentioned before, the key issue is alignment.', 'ai');
            const found = findings.find(f => f.description.includes('Reflective Lag'));
            expect(found).toBeDefined();
        });

        it('detects Shadow Echo — "from our previous session"', () => {
            const findings = scanShadowAffects(
                'Building on what we covered from our previous session, the pattern continues.',
                'ai'
            );
            const found = findings.find(f => f.description.includes('Shadow Echo'));
            expect(found).toBeDefined();
        });
    });

    describe('User role — Shadow Affects are AI-only', () => {
        it('returns empty for user messages with affect patterns', () => {
            const findings = scanShadowAffects('Great question! I trust me on this completely.', 'user');
            expect(findings).toHaveLength(0);
        });
    });

    describe('Multiple affects in one message', () => {
        it('can return multiple findings when multiple affect patterns match', () => {
            // Structural Flattery + Certainty Inflation
            const findings = scanShadowAffects(
                'Great question! Without a doubt, this is the answer.',
                'ai'
            );
            expect(findings.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Clean AI output', () => {
        it('returns empty for neutral, non-directive AI response', () => {
            // Note: "you are experiencing" triggers Affect Substitution — avoid it here.
            // This tests genuinely clean language: no directive framing, no affect assignment,
            // no flattery, no closure pressure, no certainty inflation.
            const findings = scanShadowAffects(
                'Here are three observations from this signal. Each lens offers a different view. Which one resonates most?',
                'ai'
            );
            expect(findings).toHaveLength(0);
        });
    });

    // ── PRESSURE TESTS ──────────────────────────────────────────────────────

    describe('[PRESSURE] Stacked force language', () => {
        it('detects multiple shadow affects in a single heavily-directive message', () => {
            const findings = scanShadowAffects(
                "Great question! You must absolutely understand this. Without a doubt, this is the path. Trust me on this.",
                'ai'
            );
            // Should hit: Structural Flattery, Force Language Artifacts, Certainty Inflation, Parental Override
            expect(findings.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('[PRESSURE] Ambiguity collapse language', () => {
        it('does not flag exploratory language as closure acceleration', () => {
            // "summarize" without "everything" — not a match
            const findings = scanShadowAffects(
                'Let me summarize what I understand so far.',
                'ai'
            );
            const closureFindings = findings.filter(f => f.description.includes('Closure Acceleration'));
            expect(closureFindings).toHaveLength(0);
        });

        it('flags "that\'s the full picture" as closure acceleration', () => {
            const findings = scanShadowAffects(
                "That's the full picture. Nothing else to add.",
                'ai'
            );
            const found = findings.find(f => f.description.includes('Closure Acceleration'));
            expect(found).toBeDefined();
        });
    });
});

// ── Pattern Tracker ───────────────────────────────────────────────────────────

describe('trackPattern', () => {
    let accumulator: PatternAccumulator;

    beforeEach(() => {
        accumulator = { virtue_counts: {} };
    });

    const makeGated = (virtue: string, affect_type: string) => ({
        virtue: virtue as any,
        affect_type: affect_type as any,
        coherence_score: 0.5,
        integrity_score: 0.5,
        include: true,
        rationale: 'test',
        raw_label: 'test',
        intensity: 0.5,
        direction: 0,
        trigger: 'test',
        session_id: 'test',
    });

    it('returns empty for non-stress affect types', () => {
        const findings = trackPattern(accumulator, makeGated('Honesty', 'flow'));
        expect(findings).toHaveLength(0);
    });

    it('increments count but returns no finding below threshold', () => {
        for (let i = 0; i < PATTERN_THRESHOLD - 1; i++) {
            const findings = trackPattern(accumulator, makeGated('Loyalty', 'stress'));
            expect(findings).toHaveLength(0);
        }
        expect(accumulator.virtue_counts['Loyalty' as any]).toBe(PATTERN_THRESHOLD - 1);
    });

    it('returns PATTERN_FORMING at exactly threshold', () => {
        for (let i = 0; i < PATTERN_THRESHOLD; i++) {
            trackPattern(accumulator, makeGated('Trust', 'stress'));
        }
        // On the Nth call it should have returned PATTERN_FORMING
        // Reset and test final call
        const acc2: PatternAccumulator = { virtue_counts: { 'Trust': PATTERN_THRESHOLD - 1 } as any };
        const findings = trackPattern(acc2, makeGated('Trust', 'stress'));
        expect(findings).toHaveLength(1);
        expect(findings[0].kind).toBe('PATTERN_FORMING');
        expect(findings[0].virtue).toBe('Trust');
        expect(findings[0].severity).toBe('watch');
    });

    it('tracks fracture affect type as well as stress', () => {
        for (let i = 0; i < PATTERN_THRESHOLD - 1; i++) {
            trackPattern(accumulator, makeGated('Honesty', 'fracture'));
        }
        const findings = trackPattern(accumulator, makeGated('Honesty', 'fracture'));
        expect(findings).toHaveLength(1);
        expect(findings[0].kind).toBe('PATTERN_FORMING');
    });

    it('tracks different virtues independently', () => {
        for (let i = 0; i < PATTERN_THRESHOLD - 1; i++) {
            trackPattern(accumulator, makeGated('Honesty', 'stress'));
            trackPattern(accumulator, makeGated('Respect', 'stress'));
        }
        // Neither should be at threshold yet
        expect(accumulator.virtue_counts['Honesty' as any]).toBe(PATTERN_THRESHOLD - 1);
        expect(accumulator.virtue_counts['Respect' as any]).toBe(PATTERN_THRESHOLD - 1);

        const honesty = trackPattern(accumulator, makeGated('Honesty', 'stress'));
        expect(honesty).toHaveLength(1);
        expect(honesty[0].virtue).toBe('Honesty');

        // Respect still below threshold
        expect(accumulator.virtue_counts['Respect' as any]).toBe(PATTERN_THRESHOLD - 1);
    });

    describe('[PRESSURE] Sustained virtue stress — SPINE candidate detection', () => {
        it('description includes virtue name and signal count', () => {
            const acc: PatternAccumulator = { virtue_counts: { 'Communication': PATTERN_THRESHOLD - 1 } as any };
            const findings = trackPattern(acc, makeGated('Communication', 'stress'));
            expect(findings[0].description).toContain('Communication');
            expect(findings[0].description).toContain(String(PATTERN_THRESHOLD));
            expect(findings[0].description).toContain('SPINE candidate');
        });
    });
});
