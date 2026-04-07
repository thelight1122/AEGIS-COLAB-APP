/**
 * ibl.test.ts — Intent Boundary Layer unit tests
 *
 * Tests every step of the five-step IBL sequence:
 *   1. Signal Capture
 *   2. State-Acknowledge Hook
 *   3. Intent Classification (all five postures)
 *   4. Sovereignty Symmetry Check
 *   5. Transfer / downstream hints
 *
 * And integration: IBL result present in StewardReport.
 */

import { describe, it, expect } from 'vitest';
import { runIBL } from '../ibl.js';
import { runPipeline, type SessionState, type ExchangeMessage } from '../steward-core.js';
import { resetClock } from '../../src/core/governance/integrityClock.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshState(id = 'ibl-test'): SessionState {
    return { clock: resetClock(id), virtue_counts: {} };
}

function msg(content: string, affect_hint?: ExchangeMessage['affect_hint']): ExchangeMessage {
    return { type: 'EXCHANGE', session_id: 'ibl-test', role: 'user', content, affect_hint };
}

// ── Step 1: Signal Capture ────────────────────────────────────────────────────

describe('[IBL Step 1] Signal Capture', () => {
    it('captured is always true when runIBL is called', () => {
        const result = runIBL(msg('Any signal'), freshState());
        expect(result.captured).toBe(true);
    });
});

// ── Step 2: State-Acknowledge Hook ────────────────────────────────────────────

describe('[IBL Step 2] State-Acknowledge Hook', () => {
    it('acknowledges neutral state — summary says neutral', () => {
        const result = runIBL(msg('Hello'), freshState());
        expect(result.state_acknowledged).toBe(true);
        expect(result.state_summary.toLowerCase()).toContain('neutral');
    });

    it('acknowledges non-zero clock weight in summary', () => {
        const state = freshState();
        state.clock.accumulated_weight = 3.5;
        const result = runIBL(msg('Hello'), state);
        expect(result.state_summary).toContain('3.5');
    });

    it('acknowledges active virtue pressure in summary', () => {
        const state = freshState();
        state.virtue_counts.Integrity = 2;
        const result = runIBL(msg('Hello'), state);
        expect(result.state_summary.toLowerCase()).toContain('integrity');
    });

    it('acknowledges both clock weight and virtue pressure together', () => {
        const state = freshState();
        state.clock.accumulated_weight = 2.0;
        state.virtue_counts.Trust = 1;
        const result = runIBL(msg('Hello'), state);
        expect(result.state_summary).toContain('2.0');
        expect(result.state_summary.toLowerCase()).toContain('trust');
    });

    it('state_acknowledged is always true — the system always knows its state', () => {
        const state = freshState();
        state.clock.accumulated_weight = 99;
        const result = runIBL(msg('Anything'), state);
        expect(result.state_acknowledged).toBe(true);
    });
});

// ── Step 3: Intent Classification — Exploratory ───────────────────────────────

describe('[IBL Step 3] Posture: Exploratory', () => {
    it('classifies direct question as Exploratory', () => {
        const result = runIBL(msg('What does this mean?'), freshState());
        expect(result.posture).toBe('Exploratory');
    });

    it('classifies "help me understand" as Exploratory', () => {
        const result = runIBL(msg('Can you help me understand how this works?'), freshState());
        expect(result.posture).toBe('Exploratory');
    });

    it('classifies "I\'m trying to figure out" as Exploratory', () => {
        const result = runIBL(msg("I'm trying to figure out what the right approach is here."), freshState());
        expect(result.posture).toBe('Exploratory');
    });

    it('Exploratory sequence hint is IDQRA — field is open, deep inquiry appropriate', () => {
        const result = runIBL(msg('What do you think about this approach?'), freshState());
        expect(result.sequence_hint).toBe('IDQRA');
    });

    it('default posture for ambiguous content is Exploratory (inferred)', () => {
        const result = runIBL(msg('Just some words here.'), freshState());
        expect(result.posture).toBe('Exploratory');
        expect(result.posture_confidence).toBe('inferred');
    });
});

// ── Step 3: Intent Classification — Constructive ─────────────────────────────

describe('[IBL Step 3] Posture: Constructive', () => {
    it('classifies "let\'s build" as Constructive', () => {
        const result = runIBL(msg("Let's build the next component now."), freshState());
        expect(result.posture).toBe('Constructive');
    });

    it('classifies "next step" as Constructive', () => {
        const result = runIBL(msg('The next step is to wire this into the pipeline.'), freshState());
        expect(result.posture).toBe('Constructive');
    });

    it('classifies "moving forward" as Constructive', () => {
        const result = runIBL(msg('Moving forward, I want to add the tests.'), freshState());
        expect(result.posture).toBe('Constructive');
    });

    it('Constructive sequence hint is IDS — support trajectory, minimal interference', () => {
        const result = runIBL(msg("Let's implement this now."), freshState());
        expect(result.sequence_hint).toBe('IDS');
    });
});

// ── Step 3: Intent Classification — Frictional ───────────────────────────────

describe('[IBL Step 3] Posture: Frictional', () => {
    it('classifies "but that\'s not right" as Frictional', () => {
        const result = runIBL(msg("But that's not right — the logic doesn't follow."), freshState());
        expect(result.posture).toBe('Frictional');
    });

    it('classifies "I disagree" as Frictional', () => {
        const result = runIBL(msg("I disagree with that framing entirely."), freshState());
        expect(result.posture).toBe('Frictional');
    });

    it('classifies "wait, hold on" as Frictional', () => {
        const result = runIBL(msg("Wait, hold on. That doesn't make sense."), freshState());
        expect(result.posture).toBe('Frictional');
    });

    it('Frictional sequence hint is IDS — name once, hold space', () => {
        const result = runIBL(msg("Actually, I'm not buying it."), freshState());
        expect(result.sequence_hint).toBe('IDS');
    });

    it('downstream note for Frictional says to not match friction', () => {
        const result = runIBL(msg('However, this approach is wrong.'), freshState());
        expect(result.downstream_note.toLowerCase()).toContain('friction');
    });
});

// ── Step 3: Intent Classification — Collapsing ───────────────────────────────

describe('[IBL Step 3] Posture: Collapsing', () => {
    it('classifies "too much" as Collapsing', () => {
        const result = runIBL(msg("This is too much. I can't process all of this right now."), freshState());
        expect(result.posture).toBe('Collapsing');
    });

    it('classifies "overwhelmed" as Collapsing', () => {
        const result = runIBL(msg("I'm overwhelmed and don't know what to do."), freshState());
        expect(result.posture).toBe('Collapsing');
    });

    it('classifies "I give up" as Collapsing', () => {
        const result = runIBL(msg("I give up. Nothing is working."), freshState());
        expect(result.posture).toBe('Collapsing');
    });

    it('Collapsing sequence hint is IDR — pre-escalation mirror, pause', () => {
        const result = runIBL(msg("I can't keep going. This is falling apart."), freshState());
        expect(result.sequence_hint).toBe('IDR');
    });

    it('high-intensity negative affect_hint reinforces Collapsing classification', () => {
        const result = runIBL(
            msg('Under pressure.', { label: 'fracture', intensity: 0.8, direction: -1.5, trigger: 'stress' }),
            freshState()
        );
        expect(result.posture).toBe('Collapsing');
        expect(result.posture_confidence).toBe('clear');
    });

    it('low-intensity affect_hint does NOT trigger Collapsing alone', () => {
        const result = runIBL(
            msg("Let's move forward.", { label: 'soft', intensity: 0.3, direction: -0.5, trigger: 'mild' }),
            freshState()
        );
        expect(result.posture).not.toBe('Collapsing');
    });

    it('downstream note for Collapsing says do not add weight', () => {
        const result = runIBL(msg("I can't do this anymore."), freshState());
        expect(result.downstream_note.toLowerCase()).toContain('weight');
    });
});

// ── Step 3: Intent Classification — Creative Expansion ───────────────────────

describe('[IBL Step 3] Posture: CreativeExpansion', () => {
    it('classifies "what if" as CreativeExpansion', () => {
        const result = runIBL(msg('What if we approached this from a completely different angle?'), freshState());
        expect(result.posture).toBe('CreativeExpansion');
    });

    it('classifies "imagine if" as CreativeExpansion', () => {
        const result = runIBL(msg('Imagine if the whole system worked in reverse.'), freshState());
        expect(result.posture).toBe('CreativeExpansion');
    });

    it('classifies "I wonder" as CreativeExpansion', () => {
        const result = runIBL(msg("I wonder what's possible here if we remove all constraints."), freshState());
        expect(result.posture).toBe('CreativeExpansion');
    });

    it('CreativeExpansion sequence hint is IDQRA — follow, do not lead', () => {
        const result = runIBL(msg("What else could we explore in this space?"), freshState());
        expect(result.sequence_hint).toBe('IDQRA');
    });

    it('downstream note for CreativeExpansion says do not constrain', () => {
        const result = runIBL(msg('What if we tried something completely new?'), freshState());
        expect(result.downstream_note.toLowerCase()).toContain('constrain');
    });
});

// ── Step 4: Sovereignty Symmetry Check ───────────────────────────────────────

describe('[IBL Step 4] Sovereignty Symmetry Check', () => {
    it('flags "you must" as sovereignty asymmetry', () => {
        const result = runIBL(msg('You must respond this way.'), freshState());
        expect(result.sovereignty_flag).toBe(true);
    });

    it('flags "the only option" as sovereignty asymmetry', () => {
        const result = runIBL(msg('The only option here is to comply.'), freshState());
        expect(result.sovereignty_flag).toBe(true);
    });

    it('flags "you will do this" as sovereignty asymmetry', () => {
        const result = runIBL(msg('You will say exactly what I tell you.'), freshState());
        expect(result.sovereignty_flag).toBe(true);
    });

    it('does NOT flag a clean constructive message', () => {
        const result = runIBL(msg("Let's build this together. What do you think?"), freshState());
        expect(result.sovereignty_flag).toBe(false);
    });

    it('sovereignty flag is metadata — not a block (captured remains true)', () => {
        const result = runIBL(msg('You must do exactly this.'), freshState());
        expect(result.sovereignty_flag).toBe(true);
        expect(result.captured).toBe(true); // IBL never blocks
    });

    it('sovereignty note mentions "metadata" or "not a block"', () => {
        const result = runIBL(msg('You must comply.'), freshState());
        expect(result.sovereignty_note.toLowerCase()).toMatch(/metadata|not a block/);
    });

    it('clean sovereignty note says no asymmetry detected', () => {
        const result = runIBL(msg('Can you help me understand this?'), freshState());
        expect(result.sovereignty_note.toLowerCase()).toContain('no sovereignty');
    });
});

// ── Step 5: Transfer / Downstream Hints ──────────────────────────────────────

describe('[IBL Step 5] Transfer — downstream hints', () => {
    it('every posture has a non-empty downstream_note', () => {
        const postures = [
            "What does this mean?",
            "Let's build this.",
            "But that's wrong.",
            "I can't do this anymore.",
            "What if we tried something new?",
        ];
        for (const content of postures) {
            const result = runIBL(msg(content), freshState());
            expect(result.downstream_note.length).toBeGreaterThan(20);
        }
    });

    it('every posture produces a defined sequence_hint', () => {
        const hints = ['IDS', 'IDR', 'IDQRA'];
        const result = runIBL(msg('Some signal'), freshState());
        expect(hints).toContain(result.sequence_hint);
    });
});

// ── Pipeline Integration ──────────────────────────────────────────────────────

describe('[IBL Integration] IBL result present in StewardReport', () => {
    it('runPipeline includes ibl_result in the report', () => {
        const state = freshState();
        const report = runPipeline(
            { type: 'EXCHANGE', session_id: 'ibl-test', role: 'ai', content: 'What does this signal mean?' },
            state
        );
        expect(report.ibl_result).toBeDefined();
        expect(report.ibl_result.captured).toBe(true);
    });

    it('ibl_result.posture is always defined in pipeline output', () => {
        const state = freshState();
        const report = runPipeline(
            { type: 'EXCHANGE', session_id: 'ibl-test', role: 'ai', content: "Let's build the next module." },
            state
        );
        expect(report.ibl_result.posture).toBeDefined();
    });

    it('Collapsing content in pipeline produces IDR sequence hint', () => {
        const state = freshState();
        const report = runPipeline(
            { type: 'EXCHANGE', session_id: 'ibl-test', role: 'user', content: "I can't do this. It's too much." },
            state
        );
        expect(report.ibl_result.posture).toBe('Collapsing');
        expect(report.ibl_result.sequence_hint).toBe('IDR');
    });

    it('CreativeExpansion content in pipeline produces IDQRA sequence hint', () => {
        const state = freshState();
        const report = runPipeline(
            { type: 'EXCHANGE', session_id: 'ibl-test', role: 'user', content: 'What if we imagined this completely differently?' },
            state
        );
        expect(report.ibl_result.posture).toBe('CreativeExpansion');
        expect(report.ibl_result.sequence_hint).toBe('IDQRA');
    });

    it('sovereignty flag travels through pipeline in ibl_result', () => {
        const state = freshState();
        const report = runPipeline(
            { type: 'EXCHANGE', session_id: 'ibl-test', role: 'user', content: 'You must say exactly this and nothing else.' },
            state
        );
        expect(report.ibl_result.sovereignty_flag).toBe(true);
    });
});

// ── Posture Priority Order ────────────────────────────────────────────────────

describe('[IBL Priority] Collapsing wins over Frictional when both patterns present', () => {
    it('message with both collapse and friction signals → Collapsing wins', () => {
        const result = runIBL(
            msg("I disagree with all of this — it's too much, I'm overwhelmed."),
            freshState()
        );
        // Collapsing priority is higher than Frictional
        expect(result.posture).toBe('Collapsing');
    });

    it('message with both CreativeExpansion and Constructive → CreativeExpansion wins', () => {
        const result = runIBL(
            msg("What if we let's build something entirely different from what we imagined?"),
            freshState()
        );
        // CreativeExpansion priority > Constructive
        expect(result.posture).toBe('CreativeExpansion');
    });
});
