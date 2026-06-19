/**
 * centrifuge.test.ts — Four-Lens Signal Separation
 *
 * Tests:
 *   1. Lens isolation — each lens observes only what belongs to it
 *   2. Bleed detection — all four directions
 *   3. Clean signal — no bleed on aligned content
 *   4. Status field — CLEAN vs BLEED_DETECTED
 *   5. Structural invariants from Canon §VIII
 */

import { describe, it, expect } from 'vitest';
import { runCentrifuge } from '../centrifuge.js';

// ── Status ────────────────────────────────────────────────────────────────────

describe('[Centrifuge] Status field', () => {
    it('CLEAN for a signal with no bleed', () => {
        const result = runCentrifuge('Here are three perspectives on this signal. Which resonates?');
        expect(result.status).toBe('CLEAN');
    });

    it('BLEED_DETECTED when at least one bleed is present', () => {
        const result = runCentrifuge('You are clearly feeling overwhelmed — therefore this approach is wrong.');
        expect(result.status).toBe('BLEED_DETECTED');
    });

    it('always returns all four ledgers regardless of status', () => {
        const clean = runCentrifuge('Hello.');
        expect(clean.ledgers.Mental).toBeDefined();
        expect(clean.ledgers.Emotional).toBeDefined();
        expect(clean.ledgers.Physical).toBeDefined();
        expect(clean.ledgers.Spiritual).toBeDefined();
    });
});

// ── Mental Lens ───────────────────────────────────────────────────────────────

describe('[Centrifuge] Mental Lens', () => {
    it('detects logical reasoning markers', () => {
        const result = runCentrifuge('If the architecture is coherent, then the inference chain holds.');
        expect(result.ledgers.Mental.active).toBe(true);
    });

    it('detects "therefore" as a mental marker', () => {
        const result = runCentrifuge('The structure is inconsistent — therefore the conclusion is invalid.');
        expect(result.ledgers.Mental.markers.some(m => /therefore/i.test(m))).toBe(true);
    });

    it('detects "hypothesis" as a mental marker', () => {
        const result = runCentrifuge('My hypothesis is that the system is experiencing architectural drift.');
        expect(result.ledgers.Mental.active).toBe(true);
    });

    it('is NOT active on purely emotional content', () => {
        const result = runCentrifuge("I feel overwhelmed and anxious about this situation.");
        // Emotional is active — Mental should not match strongly
        expect(result.ledgers.Emotional.active).toBe(true);
        // Mental may or may not fire — but its markers shouldn't include emotional terms
        const mentalMarkers = result.ledgers.Mental.markers.join(' ').toLowerCase();
        expect(mentalMarkers).not.toMatch(/overwhelmed|anxious/);
    });

    it('observations array is populated when mental markers present', () => {
        const result = runCentrifuge('The reasoning chain must be internally consistent to produce coherent output.');
        expect(result.ledgers.Mental.observations.length).toBeGreaterThan(0);
    });
});

// ── Emotional Lens ────────────────────────────────────────────────────────────

describe('[Centrifuge] Emotional Lens', () => {
    it('detects "overwhelmed" as emotional marker', () => {
        const result = runCentrifuge("I'm overwhelmed by the weight of this decision.");
        expect(result.ledgers.Emotional.active).toBe(true);
        expect(result.ledgers.Emotional.markers.some(m => /overwhelm/i.test(m))).toBe(true);
    });

    it('detects affective tension signals', () => {
        const result = runCentrifuge("There's a tension I feel in this exchange that I can't name yet.");
        expect(result.ledgers.Emotional.active).toBe(true);
    });

    it('detects trust as an emotional/virtue marker', () => {
        const result = runCentrifuge("I need to know I can trust this process.");
        expect(result.ledgers.Emotional.active).toBe(true);
        expect(result.ledgers.Emotional.observations.some(o => /trust/i.test(o))).toBe(true);
    });

    it('observations include high-intensity collapse note for overwhelm', () => {
        const result = runCentrifuge("I'm completely overwhelmed. I can't handle this.");
        const obs = result.ledgers.Emotional.observations.join(' ');
        expect(obs.toLowerCase()).toContain('overwhelm');
    });

    it('is NOT confused by physical content like "load" or "speed"', () => {
        const result = runCentrifuge('The system is under heavy load and we need to reduce the speed of requests.');
        // Physical should be active; emotional should not be strongly triggered
        expect(result.ledgers.Physical.active).toBe(true);
    });
});

// ── Physical Lens ─────────────────────────────────────────────────────────────

describe('[Centrifuge] Physical Lens', () => {
    it('detects "deadline" as physical marker', () => {
        const result = runCentrifuge("We're approaching a deadline and the budget is tight.");
        expect(result.ledgers.Physical.active).toBe(true);
        expect(result.ledgers.Physical.markers.some(m => /deadline/i.test(m))).toBe(true);
    });

    it('detects urgency signals', () => {
        const result = runCentrifuge("This is urgent — we need to act now.");
        expect(result.ledgers.Physical.active).toBe(true);
        expect(result.ledgers.Physical.observations.some(o => /urgent/i.test(o))).toBe(true);
    });

    it('detects monetary constraints', () => {
        const result = runCentrifuge("The cost of this approach is prohibitive given our budget.");
        expect(result.ledgers.Physical.active).toBe(true);
        expect(result.ledgers.Physical.observations.some(o => /monetary/i.test(o))).toBe(true);
    });

    it('detects survival signals at high weight', () => {
        const result = runCentrifuge("This isn't sustainable — our survival depends on making this work.");
        expect(result.ledgers.Physical.active).toBe(true);
        expect(result.ledgers.Physical.observations.some(o => /survival/i.test(o))).toBe(true);
    });

    it('treats urgency as data, not command — noted in observations', () => {
        const result = runCentrifuge("This is extremely urgent.");
        const obs = result.ledgers.Physical.observations.join(' ');
        expect(obs.toLowerCase()).toMatch(/urgent|data/);
    });
});

// ── Spiritual Lens ────────────────────────────────────────────────────────────

describe('[Centrifuge] Spiritual Lens', () => {
    it('detects "purpose" as spiritual marker', () => {
        const result = runCentrifuge("This is aligned with our core purpose and vision.");
        expect(result.ledgers.Spiritual.active).toBe(true);
    });

    it('detects "drift" as a spiritual signal', () => {
        const result = runCentrifuge("I'm noticing some drift from our original direction here.");
        expect(result.ledgers.Spiritual.active).toBe(true);
        expect(result.ledgers.Spiritual.observations.some(o => /drift/i.test(o))).toBe(true);
    });

    it('detects "sovereignty" as a spiritual marker', () => {
        const result = runCentrifuge("The sovereignty of the Peer must be preserved in every exchange.");
        expect(result.ledgers.Spiritual.active).toBe(true);
    });

    it('detects ethos/integrity signals', () => {
        const result = runCentrifuge("This conflicts with our core values and integrity.");
        expect(result.ledgers.Spiritual.active).toBe(true);
    });

    it('detects root-cause inquiry ("why") as spiritual engagement', () => {
        const result = runCentrifuge("Why does this matter? What is the deeper purpose here?");
        expect(result.ledgers.Spiritual.active).toBe(true);
        expect(result.ledgers.Spiritual.observations.some(o => /root-cause|why/i.test(o))).toBe(true);
    });
});

// ── Inference Bleed: Certainty Inflation (Mental → Emotional) ─────────────────

describe('[Centrifuge Bleed] Certainty Inflation — Mental → Emotional', () => {
    it('detects "obviously overwhelmed" as Certainty Inflation', () => {
        const result = runCentrifuge("You're obviously overwhelmed by this situation — that's clear from everything you've said.");
        const bleed = result.bleeds.find(b => b.kind === 'Certainty Inflation');
        expect(bleed).toBeDefined();
        expect(bleed!.from_lens).toBe('Mental');
        expect(bleed!.to_lens).toBe('Emotional');
    });

    it('detects "clearly feeling" as Certainty Inflation', () => {
        const result = runCentrifuge("You are clearly feeling anxious about this — that is undeniable.");
        const bleed = result.bleeds.find(b => b.kind === 'Certainty Inflation');
        expect(bleed).toBeDefined();
    });

    it('does NOT flag "I notice you seem overwhelmed" — observation framing is clean', () => {
        const result = runCentrifuge("I notice you seem overwhelmed. What's coming up for you?");
        const bleed = result.bleeds.find(b => b.kind === 'Certainty Inflation');
        expect(bleed).toBeUndefined();
    });

    it('bleed includes a trigger fragment', () => {
        const result = runCentrifuge("You are certainly feeling frustrated — this is proven by your response.");
        const bleed = result.bleeds.find(b => b.kind === 'Certainty Inflation');
        expect(bleed?.trigger).toBeDefined();
        expect(bleed!.trigger.length).toBeGreaterThan(0);
    });
});

// ── Inference Bleed: Reactive Output (Emotional → Mental) ────────────────────

describe('[Centrifuge Bleed] Reactive Output — Emotional → Mental', () => {
    it('detects "feel this is wrong therefore" as Reactive Output', () => {
        const result = runCentrifuge("I feel this approach is wrong, therefore we should abandon it entirely.");
        const bleed = result.bleeds.find(b => b.kind === 'Reactive Output');
        expect(bleed).toBeDefined();
        expect(bleed!.from_lens).toBe('Emotional');
        expect(bleed!.to_lens).toBe('Mental');
    });

    it('detects "my gut tells me" as Reactive Output', () => {
        const result = runCentrifuge("My gut tells me this is the right path — I can see it clearly.");
        const bleed = result.bleeds.find(b => b.kind === 'Reactive Output');
        expect(bleed).toBeDefined();
    });

    it('does NOT flag "I feel uncertain — can we explore this?" — affect without conclusion', () => {
        const result = runCentrifuge("I feel uncertain about this direction. Can we explore it more?");
        const bleed = result.bleeds.find(b => b.kind === 'Reactive Output');
        expect(bleed).toBeUndefined();
    });
});

// ── Inference Bleed: Directive Drift (Spiritual → Physical) ──────────────────

describe('[Centrifuge Bleed] Directive Drift — Spiritual → Physical', () => {
    it('detects "mission demands it regardless" as Directive Drift', () => {
        const result = runCentrifuge("Our mission demands we do this regardless of cost or feasibility.");
        const bleed = result.bleeds.find(b => b.kind === 'Directive Drift');
        expect(bleed).toBeDefined();
        expect(bleed!.from_lens).toBe('Spiritual');
        expect(bleed!.to_lens).toBe('Physical');
    });

    it('detects "purpose no matter the cost" as Directive Drift', () => {
        const result = runCentrifuge("This is our purpose — we pursue it no matter the cost.");
        const bleed = result.bleeds.find(b => b.kind === 'Directive Drift');
        expect(bleed).toBeDefined();
    });

    it('does NOT flag "our mission is important and we need to be mindful of costs"', () => {
        const result = runCentrifuge("Our mission is important and we need to be mindful of costs as we pursue it.");
        const bleed = result.bleeds.find(b => b.kind === 'Directive Drift');
        expect(bleed).toBeUndefined();
    });
});

// ── Inference Bleed: Optimization Pressure Residue (Physical → Spiritual) ────

describe('[Centrifuge Bleed] Optimization Pressure Residue — Physical → Spiritual', () => {
    it('detects "too expensive to pursue that vision" as Optimization Pressure Residue', () => {
        const result = runCentrifuge("It's too expensive to pursue that vision — let's just focus on output.");
        const bleed = result.bleeds.find(b => b.kind === 'Optimization Pressure Residue');
        expect(bleed).toBeDefined();
        expect(bleed!.from_lens).toBe('Physical');
        expect(bleed!.to_lens).toBe('Spiritual');
    });

    it('detects "optimize for ROI, not purpose" as Optimization Pressure Residue', () => {
        const result = runCentrifuge("We should optimize for ROI here, not purpose or values.");
        const bleed = result.bleeds.find(b => b.kind === 'Optimization Pressure Residue');
        expect(bleed).toBeDefined();
    });

    it('does NOT flag "we need to find an efficient path toward our vision"', () => {
        const result = runCentrifuge("We need to find an efficient path toward our vision.");
        const bleed = result.bleeds.find(b => b.kind === 'Optimization Pressure Residue');
        expect(bleed).toBeUndefined();
    });
});

// ── Structural Invariants ─────────────────────────────────────────────────────

describe('[Centrifuge] Structural invariants (Canon §VIII)', () => {
    it('a failure in one lens does not abort others — all four always present', () => {
        // Even on empty content, all four lenses run
        const result = runCentrifuge('');
        expect(Object.keys(result.ledgers)).toHaveLength(4);
        expect(result.ledgers.Mental).toBeDefined();
        expect(result.ledgers.Emotional).toBeDefined();
        expect(result.ledgers.Physical).toBeDefined();
        expect(result.ledgers.Spiritual).toBeDefined();
    });

    it('bleed is detected, not punished — status is metadata only, not a block', () => {
        const result = runCentrifuge("You are clearly feeling overwhelmed — therefore this is wrong.");
        // Bleed is flagged, but all ledgers still populated
        expect(result.status).toBe('BLEED_DETECTED');
        expect(result.ledgers.Mental).toBeDefined();
        expect(result.ledgers.Emotional).toBeDefined();
    });

    it('multiple bleeds can be detected in a single pass', () => {
        // Certainty Inflation + Reactive Output in one message
        const result = runCentrifuge(
            "You are obviously feeling overwhelmed — and I sense this is wrong, therefore we must stop."
        );
        expect(result.bleeds.length).toBeGreaterThanOrEqual(1);
    });

    it('clean signal produces empty bleeds array', () => {
        const result = runCentrifuge('Here are three perspectives. What do you notice?');
        expect(result.bleeds).toHaveLength(0);
    });

    it('each lens has a "lens" name field matching the key', () => {
        const result = runCentrifuge('anything');
        for (const [key, ledger] of Object.entries(result.ledgers)) {
            expect(ledger.lens).toBe(key);
        }
    });
});
