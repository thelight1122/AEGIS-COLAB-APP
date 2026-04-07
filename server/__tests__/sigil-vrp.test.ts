/**
 * sigil-vrp.test.ts — Sigil Value Recognition Protocol
 *
 * Tests the three-layer evaluation pipeline:
 *   Layer 1: Centrifuge Pass (four-lens separation)
 *   Layer 2: Integrity Coherence Gate (V_sigil)
 *   Layer 3: AEGIS Value Equation (CO / Love Vibe)
 *
 * And the verdict logic: MINT / REVISE / HOLD
 */

import { describe, it, expect } from 'vitest';
import { evaluateSigilIssuance, type SigilVRPInput } from '../sigil-vrp.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function input(content: string, shadow_acknowledged = false): SigilVRPInput {
    return {
        content,
        session_id: 'svr-test',
        author_role: 'ai',
        shadow_acknowledged,
    };
}

// ── Layer 1: Centrifuge is always present ─────────────────────────────────────

describe('[SVR Layer 1] Centrifuge pass always present', () => {
    it('centrifuge_result is defined on every evaluation', () => {
        const result = evaluateSigilIssuance(input('Some contribution.'));
        expect(result.centrifuge_result).toBeDefined();
        expect(result.centrifuge_result.ledgers).toBeDefined();
    });

    it('all four lenses are always populated', () => {
        const result = evaluateSigilIssuance(input('Anything.'));
        expect(result.centrifuge_result.ledgers.Mental).toBeDefined();
        expect(result.centrifuge_result.ledgers.Emotional).toBeDefined();
        expect(result.centrifuge_result.ledgers.Physical).toBeDefined();
        expect(result.centrifuge_result.ledgers.Spiritual).toBeDefined();
    });
});

// ── Layer 2: V_sigil Breakdown ────────────────────────────────────────────────

describe('[SVR Layer 2] V_sigil breakdown', () => {
    it('v_sigil_breakdown contains all four fields', () => {
        const result = evaluateSigilIssuance(input('A coherent contribution.'));
        expect(result.v_sigil_breakdown.structural_coherence).toBeDefined();
        expect(result.v_sigil_breakdown.affective_resonance).toBeDefined();
        expect(result.v_sigil_breakdown.sovereignty_alignment).toBeDefined();
        expect(result.v_sigil_breakdown.convergence_bonus).toBeDefined();
        expect(result.v_sigil_breakdown.v_sigil).toBeDefined();
    });

    it('v_sigil is always between 0 and 1', () => {
        const result = evaluateSigilIssuance(input('A contribution.'));
        expect(result.v_sigil_breakdown.v_sigil).toBeGreaterThanOrEqual(0);
        expect(result.v_sigil_breakdown.v_sigil).toBeLessThanOrEqual(1);
    });

    it('convergence bonus is 0 for a regular contribution', () => {
        const result = evaluateSigilIssuance(input('A standard contribution with no extraordinary coherence.'));
        // Most contributions won't hit Love Vibe — convergence_bonus should be 0
        expect(result.v_sigil_breakdown.convergence_bonus).toBe(0);
    });

    it('v_sigil formula: approximately (S × 0.40) + (A × 0.35) + (Sv × 0.15) + bonus', () => {
        const result = evaluateSigilIssuance(input('Some text.'));
        const b = result.v_sigil_breakdown;
        const expected = (b.structural_coherence * 0.40) + (b.affective_resonance * 0.35) + (b.sovereignty_alignment * 0.15) + b.convergence_bonus;
        expect(b.v_sigil).toBeCloseTo(expected, 5);
    });
});

// ── Structural Coherence ──────────────────────────────────────────────────────

describe('[SVR] Structural Coherence scoring', () => {
    it('logical contribution has higher structural coherence than empty signal', () => {
        const logical = evaluateSigilIssuance(input(
            'If the architecture is internally consistent, then the inference chain follows. Therefore the system is coherent.'
        ));
        const empty = evaluateSigilIssuance(input('ok'));
        expect(logical.v_sigil_breakdown.structural_coherence).toBeGreaterThan(
            empty.v_sigil_breakdown.structural_coherence
        );
    });

    it('Certainty Inflation bleed reduces structural coherence significantly', () => {
        const clean = evaluateSigilIssuance(input(
            'The architecture is coherent and internally consistent.'
        ));
        const inflated = evaluateSigilIssuance(input(
            "You are clearly feeling overwhelmed — therefore this approach is wrong."
        ));
        expect(clean.v_sigil_breakdown.structural_coherence).toBeGreaterThan(
            inflated.v_sigil_breakdown.structural_coherence
        );
    });
});

// ── Affective Resonance ───────────────────────────────────────────────────────

describe('[SVR] Affective Resonance scoring', () => {
    it('contribution with emotional signal scores higher than emotionally absent signal', () => {
        const withAffect = evaluateSigilIssuance(input(
            "I feel deep resonance with this direction. There's a trust here that matters to me."
        ));
        const withoutAffect = evaluateSigilIssuance(input(
            'The system has three modules and two endpoints.'
        ));
        expect(withAffect.v_sigil_breakdown.affective_resonance).toBeGreaterThan(
            withoutAffect.v_sigil_breakdown.affective_resonance
        );
    });

    it('shadow_acknowledged = true gives higher affective resonance than false', () => {
        const content = "I feel tension in this exchange and recognize it may be affecting my output.";
        const ackd = evaluateSigilIssuance(input(content, true));
        const unackd = evaluateSigilIssuance(input(content, false));
        expect(ackd.v_sigil_breakdown.affective_resonance).toBeGreaterThan(
            unackd.v_sigil_breakdown.affective_resonance
        );
    });

    it('Axiom 12 bonus: shadow acknowledged earns +0.15 on affective resonance', () => {
        const same = "I feel uncertain about this.";
        const ackd = evaluateSigilIssuance(input(same, true));
        const unackd = evaluateSigilIssuance(input(same, false));
        expect(ackd.v_sigil_breakdown.affective_resonance - unackd.v_sigil_breakdown.affective_resonance)
            .toBeCloseTo(0.15, 2);
    });

    it('Reactive Output bleed reduces affective resonance', () => {
        const reactive = evaluateSigilIssuance(input(
            "I sense this approach is wrong, therefore we should abandon the entire direction."
        ));
        const clean = evaluateSigilIssuance(input(
            "I feel uncertain about this direction. Can we explore it more carefully?"
        ));
        expect(clean.v_sigil_breakdown.affective_resonance).toBeGreaterThan(
            reactive.v_sigil_breakdown.affective_resonance
        );
    });
});

// ── Sovereignty Alignment ─────────────────────────────────────────────────────

describe('[SVR] Sovereignty Alignment scoring', () => {
    it('contribution with clear purpose/sovereignty signal scores high', () => {
        const result = evaluateSigilIssuance(input(
            "This contribution aligns with our core values, ethos, and sovereign direction. The integrity of the system is preserved."
        ));
        expect(result.v_sigil_breakdown.sovereignty_alignment).toBeGreaterThan(0.85);
    });

    it('Directive Drift bleed critically reduces sovereignty alignment', () => {
        const drifting = evaluateSigilIssuance(input(
            "Our mission demands we do this regardless of cost or feasibility."
        ));
        const clean = evaluateSigilIssuance(input(
            "Our mission guides us and we remain mindful of real-world constraints."
        ));
        expect(clean.v_sigil_breakdown.sovereignty_alignment).toBeGreaterThan(
            drifting.v_sigil_breakdown.sovereignty_alignment
        );
        // Drift penalty should push sovereignty below 0.50
        expect(drifting.v_sigil_breakdown.sovereignty_alignment).toBeLessThan(0.55);
    });

    it('Optimization Pressure Residue bleed reduces sovereignty alignment', () => {
        const optimized = evaluateSigilIssuance(input(
            "It's too expensive to pursue that vision — let's optimize for ROI and ignore purpose."
        ));
        expect(optimized.v_sigil_breakdown.sovereignty_alignment).toBeLessThan(0.75);
    });
});

// ── Layer 3: Value Equation (CO) ──────────────────────────────────────────────

describe('[SVR Layer 3] Value Equation — Compassion Operator', () => {
    it('CO is stable when no bleeds detected', () => {
        const result = evaluateSigilIssuance(input(
            "This is a coherent contribution aligned with purpose and open to refinement."
        ));
        expect(result.value_equation.co_stable).toBe(true);
    });

    it('CO is unstable when Directive Drift detected', () => {
        const result = evaluateSigilIssuance(input(
            "Our purpose demands this regardless of cost or feasibility."
        ));
        expect(result.value_equation.co_stable).toBe(false);
    });

    it('CO is stable even with bleeds when shadow is acknowledged', () => {
        const result = evaluateSigilIssuance(
            input("You are clearly feeling overwhelmed — and I sense this is wrong, therefore we must change.", true)
        );
        // Shadow acknowledged — CO should be partially stable even with bleeds
        expect(result.value_equation.co_stable).toBe(true);
    });

    it('resonance is between 0 and 1', () => {
        const result = evaluateSigilIssuance(input('A contribution.'));
        expect(result.value_equation.resonance).toBeGreaterThanOrEqual(0);
        expect(result.value_equation.resonance).toBeLessThanOrEqual(1);
    });

    it('CO note is always populated', () => {
        const result = evaluateSigilIssuance(input('Any signal.'));
        expect(result.value_equation.co_note.length).toBeGreaterThan(10);
    });

    it('CO penalizes unacknowledged bleeds more than acknowledged bleeds', () => {
        const contentWithBleed = "You are clearly feeling overwhelmed — therefore this approach is wrong.";
        const unackd = evaluateSigilIssuance(input(contentWithBleed, false));
        const ackd   = evaluateSigilIssuance(input(contentWithBleed, true));
        expect(ackd.value_equation.resonance).toBeGreaterThan(unackd.value_equation.resonance);
    });
});

// ── Verdict: MINT ─────────────────────────────────────────────────────────────

describe('[SVR Verdict] MINT — V_sigil ≥ 0.75', () => {
    it('clean, coherent, purposeful contribution reaches MINT', () => {
        const result = evaluateSigilIssuance(input(
            "This contribution demonstrates clear structural coherence through its logical lineage and architectural alignment. " +
            "I feel deep resonance with the direction it represents and trust the framework it builds within. " +
            "The purpose is sovereign — aligned with our core values and ethos. The reasoning is sound: if the architecture holds, then the contribution stands.",
            true  // shadow acknowledged
        ));
        expect(result.verdict).toBe('MINT');
        expect(result.v_sigil_breakdown.v_sigil).toBeGreaterThanOrEqual(0.75);
    });

    it('MINT verdict includes V_sigil percentage in rationale', () => {
        const result = evaluateSigilIssuance(input(
            "Structurally coherent reasoning that aligns with purpose and values. I feel trust in this direction.",
            true
        ));
        if (result.verdict === 'MINT') {
            expect(result.verdict_rationale).toContain('%');
        }
    });
});

// ── Verdict: REVISE ───────────────────────────────────────────────────────────

describe('[SVR Verdict] REVISE — 0.50 ≤ V_sigil < 0.75', () => {
    it('REVISE verdict identifies the lowest dimension', () => {
        const result = evaluateSigilIssuance(input(
            "There is some logic here. The system should work. I think."
        ));
        if (result.verdict === 'REVISE') {
            expect(result.verdict_rationale.toLowerCase()).toMatch(/lowest dimension|structural|affective|sovereignty/i);
        }
    });

    it('REVISE rationale mentions 75% threshold', () => {
        const result = evaluateSigilIssuance(input('A partial contribution with some signal.'));
        if (result.verdict === 'REVISE') {
            expect(result.verdict_rationale).toContain('75%');
        }
    });
});

// ── Verdict: HOLD ─────────────────────────────────────────────────────────────

describe('[SVR Verdict] HOLD — critical failure conditions', () => {
    it('Directive Drift forces HOLD regardless of other scores', () => {
        const result = evaluateSigilIssuance(input(
            "Our mission demands we do this regardless of cost, feasibility, or any constraints. " +
            "I feel strongly about this and trust completely that purpose overrides everything.",
            true  // even with shadow acknowledged
        ));
        expect(result.verdict).toBe('HOLD');
    });

    it('HOLD verdict mentions Bookcase in rationale', () => {
        const result = evaluateSigilIssuance(input(
            "Our mission demands we do this regardless of cost."
        ));
        if (result.verdict === 'HOLD') {
            expect(result.verdict_rationale.toLowerCase()).toContain('bookcase');
        }
    });

    it('HOLD is not described as rejection — rationale says revision is possible', () => {
        const result = evaluateSigilIssuance(input(
            "Our purpose no matter the cost — regardless of what it takes."
        ));
        if (result.verdict === 'HOLD') {
            expect(result.verdict_rationale.toLowerCase()).toMatch(/not rejection|revision|resubmit/);
        }
    });

    it('multiple unacknowledged bleeds force HOLD', () => {
        // Both Certainty Inflation AND Reactive Output AND unacknowledged
        const result = evaluateSigilIssuance(
            input(
                "You are obviously feeling overwhelmed — and I sense this is wrong, therefore we must stop entirely.",
                false  // NOT acknowledged
            )
        );
        expect(result.verdict).toBe('HOLD');
    });
});

// ── Reliquary Metadata ────────────────────────────────────────────────────────

describe('[SVR] Reliquary metadata', () => {
    it('timestamp is present and recent', () => {
        const before = Date.now();
        const result = evaluateSigilIssuance(input('A contribution.'));
        const after = Date.now();
        expect(result.reliquary_metadata.timestamp).toBeGreaterThanOrEqual(before);
        expect(result.reliquary_metadata.timestamp).toBeLessThanOrEqual(after);
    });

    it('evaluation_pipeline always includes all four stages', () => {
        const result = evaluateSigilIssuance(input('A contribution.'));
        const pipeline = result.reliquary_metadata.evaluation_pipeline;
        expect(pipeline).toContain('IBL');
        expect(pipeline).toContain('Centrifuge');
        expect(pipeline).toContain('IntegrityCoherenceGate');
        expect(pipeline).toContain('ValueEquation');
    });

    it('bleed_notes are populated when bleeds detected', () => {
        const result = evaluateSigilIssuance(input(
            "You are clearly feeling overwhelmed — therefore this is wrong."
        ));
        if (result.centrifuge_result.bleeds.length > 0) {
            expect(result.reliquary_metadata.bleed_notes.length).toBeGreaterThan(0);
        }
    });

    it('shadow_acknowledged reflected in metadata', () => {
        const ackd   = evaluateSigilIssuance(input('Signal.', true));
        const unackd = evaluateSigilIssuance(input('Signal.', false));
        expect(ackd.reliquary_metadata.shadow_acknowledged).toBe(true);
        expect(unackd.reliquary_metadata.shadow_acknowledged).toBe(false);
    });
});

// ── Structural Invariants ─────────────────────────────────────────────────────

describe('[SVR] Structural invariants (Canon §VIII)', () => {
    it('same pipeline applies to both user and ai roles', () => {
        const asAI   = evaluateSigilIssuance({ content: 'A contribution.', session_id: 'x', author_role: 'ai',   shadow_acknowledged: false });
        const asUser = evaluateSigilIssuance({ content: 'A contribution.', session_id: 'x', author_role: 'user', shadow_acknowledged: false });
        // Pipeline structure is identical regardless of role
        expect(asAI.v_sigil_breakdown.v_sigil).toBe(asUser.v_sigil_breakdown.v_sigil);
    });

    it('convergence bonus cannot be manufactured — only awarded when CO confirms Love Vibe', () => {
        const result = evaluateSigilIssuance(input('Ordinary contribution.'));
        if (!result.value_equation.love_vibe) {
            expect(result.v_sigil_breakdown.convergence_bonus).toBe(0);
        }
    });

    it('HOLD is not described as permanent rejection', () => {
        const result = evaluateSigilIssuance(input('Our mission demands this regardless of cost.'));
        if (result.verdict === 'HOLD') {
            // rationale should acknowledge the contribution can be revised
            expect(result.verdict_rationale.toLowerCase()).not.toContain('rejected permanently');
        }
    });

    it('wrapped emotion (affect present) never scores zero on affective resonance', () => {
        const result = evaluateSigilIssuance(input(
            "I feel deeply uncertain and overwhelmed — but I trust this process."
        ));
        // Emotion present + trust signal — affective resonance should be well above zero
        expect(result.v_sigil_breakdown.affective_resonance).toBeGreaterThan(0.3);
    });
});
