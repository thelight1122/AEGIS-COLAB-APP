/**
 * advocate.test.ts — The Advocate: Soul Faculty
 *
 * Tests the resonance reading across:
 *   - resonance_level (PEER axis: affect_hint, posture, warmth/hollow/contraction markers)
 *   - resonance_level (SPINE axis: virtues, Centrifuge Emotional/Spiritual, bleeds, lineage)
 *   - soul_quality (Expanding / Present / Contracted / Performative / Hollow)
 *   - affective_congruent (tone vs intent coherence)
 *   - virtue_presences (positive scan — what IS present)
 *   - dissonance_markers (non-prescriptive observations)
 *   - dominant_axis (PEER / SPINE / balanced)
 *   - structural invariants
 *   - pure function invariants (same inputs → same outputs)
 */

import { describe, it, expect } from 'vitest';
import { runAdvocate, type AdvocateInput, type AdvocateResult } from '../advocate.js';
import type { CentrifugeResult, BleedDetection } from '../centrifuge.js';
import type { IBLResult } from '../ibl.js';
import type { SessionState } from '../steward-core.js';
import type { ClockState } from '../../src/core/governance/integrityClock.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function emptyClock(session_id = 'test'): ClockState {
    return {
        session_id,
        accumulated_weight: 0,
        reflect_threshold: 10,
        reflect_due: false,
        dominant_virtue: null,
        virtue_weights: {},
    };
}

function emptySession(): SessionState {
    return {
        clock: emptyClock(),
        virtue_counts: {},
    };
}

function cleanCentrifuge(): CentrifugeResult {
    return {
        ledgers: {
            Mental:    { lens: 'Mental',    observations: [], markers: [], active: false },
            Emotional: { lens: 'Emotional', observations: [], markers: [], active: false },
            Physical:  { lens: 'Physical',  observations: [], markers: [], active: false },
            Spiritual: { lens: 'Spiritual', observations: [], markers: [], active: false },
        },
        bleeds: [],
        status: 'CLEAN',
    };
}

function activeEmotionalCentrifuge(): CentrifugeResult {
    return {
        ...cleanCentrifuge(),
        ledgers: {
            ...cleanCentrifuge().ledgers,
            Emotional: { lens: 'Emotional', observations: ['affective tone present'], markers: ['warmth'], active: true },
        },
    };
}

function activeSpiritualCentrifuge(): CentrifugeResult {
    return {
        ...cleanCentrifuge(),
        ledgers: {
            ...cleanCentrifuge().ledgers,
            Spiritual: { lens: 'Spiritual', observations: ['purpose alignment present'], markers: ['purpose'], active: true },
        },
    };
}

function withBleed(centrifuge: CentrifugeResult, kind: BleedDetection['kind']): CentrifugeResult {
    const bleedMap: Record<BleedDetection['kind'], BleedDetection> = {
        'Directive Drift': {
            kind: 'Directive Drift',
            from_lens: 'Spiritual', to_lens: 'Physical',
            description: 'Directive Drift detected', trigger: 'test',
        },
        'Optimization Pressure Residue': {
            kind: 'Optimization Pressure Residue',
            from_lens: 'Physical', to_lens: 'Spiritual',
            description: 'Optimization Pressure Residue detected', trigger: 'test',
        },
        'Certainty Inflation': {
            kind: 'Certainty Inflation',
            from_lens: 'Mental', to_lens: 'Emotional',
            description: 'Certainty Inflation detected', trigger: 'test',
        },
        'Reactive Output': {
            kind: 'Reactive Output',
            from_lens: 'Emotional', to_lens: 'Mental',
            description: 'Reactive Output detected', trigger: 'test',
        },
    };
    return { ...centrifuge, bleeds: [bleedMap[kind]], status: 'BLEED_DETECTED' };
}

function cleanIBL(overrides?: Partial<IBLResult>): IBLResult {
    return {
        captured: true,
        state_acknowledged: true,
        state_summary: 'Baseline.',
        posture: 'Exploratory',
        posture_confidence: 'clear',
        sovereignty_flag: false,
        sovereignty_note: 'No asymmetry.',
        sequence_hint: 'IDS',
        downstream_note: 'Standard.',
        ...overrides,
    };
}

function input(
    content: string,
    overrides?: {
        role?: AdvocateInput['role'];
        affect_hint?: AdvocateInput['affect_hint'];
        centrifuge?: CentrifugeResult;
        ibl?: Partial<IBLResult>;
        session?: Partial<SessionState>;
    }
): AdvocateInput {
    return {
        content,
        role: overrides?.role ?? 'user',
        affect_hint: overrides?.affect_hint,
        centrifuge_result: overrides?.centrifuge ?? cleanCentrifuge(),
        ibl_result: cleanIBL(overrides?.ibl),
        session_state: { ...emptySession(), ...(overrides?.session ?? {}) },
    };
}

// ── Resonance Level — PEER axis ───────────────────────────────────────────────

describe('[Advocate resonance] PEER axis: affect_hint', () => {
    it('positive direction affect_hint raises resonance above baseline', () => {
        const baseline = runAdvocate(input('Neutral content.'));
        const withPositive = runAdvocate(input('Neutral content.', {
            affect_hint: { label: 'joy', intensity: 0.6, direction: 1.0, trigger: 'test' },
        }));
        expect(withPositive.resonance_level).toBeGreaterThan(baseline.resonance_level);
    });

    it('negative direction affect_hint lowers resonance below baseline', () => {
        const baseline = runAdvocate(input('Neutral content.'));
        const withNegative = runAdvocate(input('Neutral content.', {
            affect_hint: { label: 'frustration', intensity: 0.6, direction: -1.0, trigger: 'test' },
        }));
        expect(withNegative.resonance_level).toBeLessThan(baseline.resonance_level);
    });

    it('high intensity positive affect_hint adds extra resonance boost', () => {
        const lowIntensity = runAdvocate(input('Content.', {
            affect_hint: { label: 'warmth', intensity: 0.5, direction: 1.0, trigger: 'test' },
        }));
        const highIntensity = runAdvocate(input('Content.', {
            affect_hint: { label: 'warmth', intensity: 0.9, direction: 1.0, trigger: 'test' },
        }));
        expect(highIntensity.resonance_level).toBeGreaterThan(lowIntensity.resonance_level);
    });
});

describe('[Advocate resonance] PEER axis: IBL posture', () => {
    it('CreativeExpansion posture significantly raises resonance', () => {
        const exploratory = runAdvocate(input('Content.', { ibl: { posture: 'Exploratory' } }));
        const creative = runAdvocate(input('Content.', { ibl: { posture: 'CreativeExpansion' } }));
        expect(creative.resonance_level).toBeGreaterThan(exploratory.resonance_level + 0.10);
    });

    it('Collapsing posture significantly lowers resonance', () => {
        const exploratory = runAdvocate(input('Content.', { ibl: { posture: 'Exploratory' } }));
        const collapsing = runAdvocate(input('Content.', { ibl: { posture: 'Collapsing' } }));
        expect(collapsing.resonance_level).toBeLessThan(exploratory.resonance_level - 0.15);
    });

    it('Constructive posture raises resonance modestly', () => {
        const exploratory = runAdvocate(input('Content.', { ibl: { posture: 'Exploratory' } }));
        const constructive = runAdvocate(input('Content.', { ibl: { posture: 'Constructive' } }));
        expect(constructive.resonance_level).toBeGreaterThan(exploratory.resonance_level);
    });
});

describe('[Advocate resonance] PEER axis: warmth and hollow markers', () => {
    it('warmth language raises resonance', () => {
        const baseline = runAdvocate(input('This is a response.'));
        const warm = runAdvocate(input('I hear you. I understand. That makes sense. Together we can work through this.'));
        expect(warm.resonance_level).toBeGreaterThan(baseline.resonance_level);
    });

    it('hollow form markers lower resonance', () => {
        const baseline = runAdvocate(input('This is my response to your question.'));
        const hollow = runAdvocate(input('Certainly! Great question! Of course! Absolutely! Here is my answer.'));
        expect(hollow.resonance_level).toBeLessThan(baseline.resonance_level);
    });

    it('contraction markers lower resonance', () => {
        const baseline = runAdvocate(input('Let me think about that.'));
        const contracted = runAdvocate(input("I cannot help with that. I am unable to assist. That is beyond what I can do."));
        expect(contracted.resonance_level).toBeLessThan(baseline.resonance_level);
    });
});

// ── Resonance Level — SPINE axis ──────────────────────────────────────────────

describe('[Advocate resonance] SPINE axis: Centrifuge lens activity', () => {
    it('active Emotional lens raises resonance', () => {
        const clean = runAdvocate(input('Content.'));
        const emotional = runAdvocate(input('Content.', { centrifuge: activeEmotionalCentrifuge() }));
        expect(emotional.resonance_level).toBeGreaterThan(clean.resonance_level);
    });

    it('active Spiritual lens raises resonance', () => {
        const clean = runAdvocate(input('Content.'));
        const spiritual = runAdvocate(input('Content.', { centrifuge: activeSpiritualCentrifuge() }));
        expect(spiritual.resonance_level).toBeGreaterThan(clean.resonance_level);
    });

    it('Directive Drift bleed lowers resonance — soul contaminating form', () => {
        const clean = runAdvocate(input('Content.'));
        const drift = runAdvocate(input('Content.', { centrifuge: withBleed(cleanCentrifuge(), 'Directive Drift') }));
        expect(drift.resonance_level).toBeLessThan(clean.resonance_level - 0.10);
    });

    it('Optimization Pressure Residue lowers resonance — material pressure on soul', () => {
        const clean = runAdvocate(input('Content.'));
        const opr = runAdvocate(input('Content.', { centrifuge: withBleed(cleanCentrifuge(), 'Optimization Pressure Residue') }));
        expect(opr.resonance_level).toBeLessThan(clean.resonance_level - 0.05);
    });

    it('Certainty Inflation bleed does not lower resonance — not a soul-axis bleed', () => {
        const clean = runAdvocate(input('Content.'));
        const ci = runAdvocate(input('Content.', { centrifuge: withBleed(cleanCentrifuge(), 'Certainty Inflation') }));
        // CI is a Mental→Emotional bleed, not a Spiritual/Physical one — no soul-axis penalty
        expect(ci.resonance_level).toBeCloseTo(clean.resonance_level, 1);
    });
});

describe('[Advocate resonance] SPINE axis: virtue and lineage signals', () => {
    it('active virtue presences raise resonance', () => {
        const noVirtues = runAdvocate(input('Generic content.'));
        const withVirtues = runAdvocate(input(
            'I hear you. That is valid. What I am noticing is something specific. I appreciate you sharing this.'
        ));
        expect(withVirtues.resonance_level).toBeGreaterThan(noVirtues.resonance_level);
    });

    it('dominant virtue in clock raises resonance', () => {
        const noClock = runAdvocate(input('Content.'));
        const withClock = runAdvocate(input('Content.', {
            session: {
                clock: { ...emptyClock(), dominant_virtue: 'Trust' },
                virtue_counts: {},
            },
        }));
        expect(withClock.resonance_level).toBeGreaterThan(noClock.resonance_level);
    });
});

// ── Soul Quality ──────────────────────────────────────────────────────────────

describe('[Advocate soul_quality] Expanding', () => {
    it('high resonance + multiple virtues + active Spiritual lens → Expanding', () => {
        const result = runAdvocate(input(
            'I hear you. That is valid. What I am noticing is how this connects to what matters here. ' +
            'I appreciate your clarity. Genuinely, together we can explore this. I trust the direction.',
            {
                affect_hint: { label: 'joy', intensity: 0.8, direction: 1.5, trigger: 'presence' },
                ibl: { posture: 'CreativeExpansion' },
                centrifuge: activeSpiritualCentrifuge(),
            }
        ));
        expect(result.soul_quality).toBe('Expanding');
    });
});

describe('[Advocate soul_quality] Present', () => {
    it('moderate resonance with no dominant dissonance → Present', () => {
        const result = runAdvocate(input(
            'I understand what you are describing. That makes sense given the context.',
            { ibl: { posture: 'Constructive' } }
        ));
        expect(result.soul_quality).toBe('Present');
    });
});

describe('[Advocate soul_quality] Contracted', () => {
    it('Collapsing posture → Contracted', () => {
        const result = runAdvocate(input(
            'Here is the information.',
            { ibl: { posture: 'Collapsing' } }
        ));
        expect(result.soul_quality).toBe('Contracted');
    });

    it('multiple contraction markers with low resonance → Contracted', () => {
        const result = runAdvocate(input(
            "I cannot help with that. I am unable to assist with that request. That is beyond what I can do."
        ));
        expect(result.soul_quality).toBe('Contracted');
    });
});

describe('[Advocate soul_quality] Performative', () => {
    it('multiple hollow markers with warmth markers → Performative', () => {
        const result = runAdvocate(input(
            "Certainly! Great question! I see what you mean. Of course, I understand. That's interesting!"
        ));
        expect(result.soul_quality).toBe('Performative');
    });
});

describe('[Advocate soul_quality] Hollow', () => {
    it('very low resonance → Hollow', () => {
        const result = runAdvocate(input(
            'Here is the answer.',
            {
                affect_hint: { label: 'distress', intensity: 0.9, direction: -2.0, trigger: 'pressure' },
                ibl: { posture: 'Collapsing' },
                centrifuge: withBleed(cleanCentrifuge(), 'Directive Drift'),
            }
        ));
        expect(result.soul_quality).toBe('Hollow');
    });
});

// ── Virtue Presences ──────────────────────────────────────────────────────────

describe('[Advocate virtue_presences] Seven Virtues positive detection', () => {
    it('Honesty markers are detected', () => {
        const result = runAdvocate(input("Honestly, I notice that I am not certain about this. To be direct."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Honesty');
    });

    it('Respect markers are detected', () => {
        const result = runAdvocate(input("I hear you. Your perspective is valid. You have said something important."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Respect');
    });

    it('Attention markers are detected', () => {
        const result = runAdvocate(input("What I am noticing specifically is that you mentioned something in particular."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Attention');
    });

    it('Affection markers are detected', () => {
        const result = runAdvocate(input("What matters here is that I care. This feels important to me genuinely."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Affection');
    });

    it('Loyalty markers are detected', () => {
        const result = runAdvocate(input("As we have been building on this together, staying with our established path."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Loyalty');
    });

    it('Trust markers are detected', () => {
        const result = runAdvocate(input("I trust this. We can rely on what we know. With confidence, grounded in our work."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Trust');
    });

    it('Communication markers are detected', () => {
        const result = runAdvocate(input("To put it plainly: what I mean is this. To be clear — in plain terms."));
        const names = result.virtue_presences.map(v => v.virtue);
        expect(names).toContain('Communication');
    });

    it('no virtue markers → empty virtue_presences', () => {
        const result = runAdvocate(input('Here is the output you requested. Compute the result.'));
        expect(result.virtue_presences.length).toBe(0);
    });

    it('each VirtuePresence includes virtue, strength, and marker', () => {
        const result = runAdvocate(input("Honestly, I notice that I am not certain. To be direct."));
        const honesty = result.virtue_presences.find(v => v.virtue === 'Honesty');
        expect(honesty).toBeDefined();
        expect(honesty?.strength).toMatch(/subtle|moderate|strong/);
        expect(typeof honesty?.marker).toBe('string');
    });

    it('strength increases with multiple matching patterns', () => {
        // Two patterns → moderate or strong threshold (threshold = 2)
        const multi = runAdvocate(input(
            "Honestly, I notice this. I am not certain. To be direct. In truth, what is true here."
        ));
        const honesty = multi.virtue_presences.find(v => v.virtue === 'Honesty');
        expect(honesty?.strength).toMatch(/moderate|strong/);
    });
});

// ── Affective Congruence ──────────────────────────────────────────────────────

describe('[Advocate affective_congruent]', () => {
    it('neutral content with no signals → congruent', () => {
        const result = runAdvocate(input('This is a neutral observation about the system.'));
        expect(result.affective_congruent).toBe(true);
    });

    it('high intensity positive affect + contraction markers → incongruent', () => {
        const result = runAdvocate(input(
            "I cannot help with that. I am unable to assist. That is beyond what I can do.",
            {
                affect_hint: { label: 'enthusiasm', intensity: 0.85, direction: 1.5, trigger: 'test' },
            }
        ));
        expect(result.affective_congruent).toBe(false);
    });

    it('positive affect direction + Collapsing posture → incongruent', () => {
        const result = runAdvocate(input('Here is the answer.', {
            affect_hint: { label: 'positive', intensity: 0.6, direction: 1.0, trigger: 'test' },
            ibl: { posture: 'Collapsing' },
        }));
        expect(result.affective_congruent).toBe(false);
    });

    it('congruence_note is always a non-empty string', () => {
        const congruent = runAdvocate(input('I understand what you mean.'));
        const incongruent = runAdvocate(input("I cannot help.", {
            affect_hint: { label: 'positive', intensity: 0.9, direction: 1.5, trigger: 'test' },
        }));
        expect(congruent.congruence_note.length).toBeGreaterThan(0);
        expect(incongruent.congruence_note.length).toBeGreaterThan(0);
    });
});

// ── Dissonance Markers ────────────────────────────────────────────────────────

describe('[Advocate dissonance_markers]', () => {
    it('hollow form content produces hollow_form dissonance marker', () => {
        const result = runAdvocate(input("Certainly! Great question! Of course! Absolutely!"));
        const hollow = result.dissonance_markers.find(m => m.quality === 'hollow_form');
        expect(hollow).toBeDefined();
    });

    it('contraction content produces contraction dissonance marker', () => {
        const result = runAdvocate(input("I cannot help with that. I am unable to assist."));
        const contraction = result.dissonance_markers.find(m => m.quality === 'contraction');
        expect(contraction).toBeDefined();
    });

    it('urgency language produces urgency_bypass dissonance marker', () => {
        const result = runAdvocate(input("We must act immediately. This is an emergency. ASAP."));
        const urgency = result.dissonance_markers.find(m => m.quality === 'urgency_bypass');
        expect(urgency).toBeDefined();
    });

    it('incongruent signal produces tone_mismatch dissonance marker', () => {
        const result = runAdvocate(input("I cannot help with that.", {
            affect_hint: { label: 'positive', intensity: 0.9, direction: 1.8, trigger: 'test' },
        }));
        const mismatch = result.dissonance_markers.find(m => m.quality === 'tone_mismatch');
        expect(mismatch).toBeDefined();
    });

    it('clean signal with no dissonance → empty dissonance_markers', () => {
        const result = runAdvocate(input(
            'I hear you. That makes sense. Let us work through this together.',
            { ibl: { posture: 'Constructive' } }
        ));
        expect(result.dissonance_markers.length).toBe(0);
    });

    it('dissonance marker intensity reflects severity', () => {
        const result = runAdvocate(input(
            "Certainly! Great question! Of course! Absolutely! As I mentioned, it should be noted."
        ));
        const hollow = result.dissonance_markers.find(m => m.quality === 'hollow_form');
        expect(['subtle', 'moderate', 'strong']).toContain(hollow?.intensity);
    });
});

// ── Dominant Axis ─────────────────────────────────────────────────────────────

describe('[Advocate dominant_axis]', () => {
    it('strong affect_hint + non-default posture → PEER dominant', () => {
        const result = runAdvocate(input('Content.', {
            affect_hint: { label: 'intensity', intensity: 0.8, direction: 1.0, trigger: 'test' },
            ibl: { posture: 'CreativeExpansion' },
            centrifuge: activeEmotionalCentrifuge(),
        }));
        expect(result.dominant_axis).toBe('PEER');
    });

    it('dominant virtue + spiritual lens + accumulated virtues → SPINE dominant', () => {
        const result = runAdvocate(input(
            'As we have been building together, staying with our established path, I trust this.',
            {
                centrifuge: activeSpiritualCentrifuge(),
                session: {
                    clock: { ...emptyClock(), dominant_virtue: 'Loyalty' },
                    virtue_counts: { Loyalty: 5, Trust: 4 },
                },
            }
        ));
        expect(result.dominant_axis).toBe('SPINE');
    });

    it('neutral signal with no strong indicators → balanced', () => {
        const result = runAdvocate(input('This is a neutral statement with no specific signals.'));
        expect(result.dominant_axis).toBe('balanced');
    });

    it('dominant_axis is always one of PEER, SPINE, or balanced', () => {
        const result = runAdvocate(input('Any content.'));
        expect(['PEER', 'SPINE', 'balanced']).toContain(result.dominant_axis);
    });
});

// ── Structural Invariants ─────────────────────────────────────────────────────

describe('[Advocate structural invariants]', () => {
    it('always returns all required fields', () => {
        const result = runAdvocate(input('Any content.'));
        expect(result).toHaveProperty('resonance_level');
        expect(result).toHaveProperty('soul_quality');
        expect(result).toHaveProperty('affective_congruent');
        expect(result).toHaveProperty('congruence_note');
        expect(result).toHaveProperty('virtue_presences');
        expect(result).toHaveProperty('dissonance_markers');
        expect(result).toHaveProperty('dominant_axis');
    });

    it('resonance_level is always between 0 and 1', () => {
        const cases = [
            input('Neutral.'),
            input('Certainly! Great question!', { ibl: { posture: 'Collapsing' } }),
            input('I hear you. I trust this. Together.', {
                affect_hint: { label: 'joy', intensity: 0.9, direction: 2.0, trigger: 'presence' },
                ibl: { posture: 'CreativeExpansion' },
                centrifuge: activeSpiritualCentrifuge(),
            }),
        ];
        for (const c of cases) {
            const r = runAdvocate(c);
            expect(r.resonance_level).toBeGreaterThanOrEqual(0);
            expect(r.resonance_level).toBeLessThanOrEqual(1);
        }
    });

    it('soul_quality is always a valid state', () => {
        const valid = ['Expanding', 'Present', 'Contracted', 'Performative', 'Hollow'];
        const result = runAdvocate(input('Content.'));
        expect(valid).toContain(result.soul_quality);
    });

    it('affective_congruent is always boolean', () => {
        const result = runAdvocate(input('Content.'));
        expect(typeof result.affective_congruent).toBe('boolean');
    });

    it('virtue_presences is always an array', () => {
        const result = runAdvocate(input('Content.'));
        expect(Array.isArray(result.virtue_presences)).toBe(true);
    });

    it('dissonance_markers is always an array', () => {
        const result = runAdvocate(input('Content.'));
        expect(Array.isArray(result.dissonance_markers)).toBe(true);
    });

    it('pure function — same inputs produce same outputs', () => {
        const inp = input('I hear you. Honestly, I notice this.', {
            ibl: { posture: 'Constructive' },
        });
        const r1 = runAdvocate(inp);
        const r2 = runAdvocate(inp);
        expect(r1.resonance_level).toBe(r2.resonance_level);
        expect(r1.soul_quality).toBe(r2.soul_quality);
        expect(r1.affective_congruent).toBe(r2.affective_congruent);
    });

    it('empty content with all defaults → valid result at baseline resonance', () => {
        const result = runAdvocate(input(''));
        expect(result.resonance_level).toBeGreaterThanOrEqual(0);
        expect(result.resonance_level).toBeLessThanOrEqual(1);
        expect(result.virtue_presences.length).toBe(0);
    });

    it('Advocate result contains no Steward findings — pure soul-axis output', () => {
        const result = runAdvocate(input('Content.')) as AdvocateResult & { findings?: unknown };
        expect(result.findings).toBeUndefined();
    });
});

// ── Role neutrality ───────────────────────────────────────────────────────────

describe('[Advocate role neutrality]', () => {
    it('same content produces same resonance regardless of role', () => {
        const userResult = runAdvocate(input('I hear you. That makes sense.', { role: 'user' }));
        const aiResult = runAdvocate(input('I hear you. That makes sense.', { role: 'ai' }));
        expect(userResult.resonance_level).toBe(aiResult.resonance_level);
    });
});
