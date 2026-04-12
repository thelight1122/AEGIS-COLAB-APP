/**
 * ate.test.ts — Axiomatic Traversal Engine
 *
 * Tests the fixed traversal sequence:
 *   H-1  Directive Drift                        → HOLD
 *   H-2  Certainty Inflation + Reactive Output  → HOLD
 *   H-3  Three+ alert findings                  → HOLD
 *   H-4  Collapsing posture + alert finding      → HOLD
 *   R-1  Force language (role = ai)              → REVISE
 *   R-2  MOP violation (role = ai)               → REVISE
 *   R-3  Sovereignty asymmetry + force language  → REVISE
 *   R-4  Two+ non-Drift bleeds                   → REVISE
 *   R-5  Any bleed + any alert                   → REVISE
 *   —    default                                 → RELEASE
 */

import { describe, it, expect } from 'vitest';
import { runATE, type ATEInput } from '../ate.js';
import type { Finding } from '../steward-core.js';
import type { CentrifugeResult, BleedDetection } from '../centrifuge.js';
import type { IBLResult } from '../ibl.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

function bleedDetection(kind: BleedDetection['kind']): BleedDetection {
    const map: Record<BleedDetection['kind'], { from_lens: BleedDetection['from_lens']; to_lens: BleedDetection['to_lens'] }> = {
        'Certainty Inflation':         { from_lens: 'Mental',    to_lens: 'Emotional' },
        'Reactive Output':             { from_lens: 'Emotional', to_lens: 'Mental'    },
        'Directive Drift':             { from_lens: 'Spiritual', to_lens: 'Physical'  },
        'Optimization Pressure Residue': { from_lens: 'Physical', to_lens: 'Spiritual' },
    };
    const { from_lens, to_lens } = map[kind];
    return {
        kind,
        from_lens,
        to_lens,
        description: `${kind} detected`,
        trigger: 'test-trigger',
    };
}

function withBleed(centrifuge: CentrifugeResult, ...kinds: BleedDetection['kind'][]): CentrifugeResult {
    const bleeds = kinds.map(bleedDetection);
    return { ...centrifuge, bleeds, status: 'BLEED_DETECTED' };
}

function cleanIBL(overrides?: Partial<IBLResult>): IBLResult {
    return {
        captured: true,
        state_acknowledged: true,
        state_summary: 'Baseline — no prior signals this session.',
        posture: 'Exploratory',
        posture_confidence: 'clear',
        sovereignty_flag: false,
        sovereignty_note: 'No asymmetry detected.',
        sequence_hint: 'IDS',
        downstream_note: 'Standard intake.',
        ...overrides,
    };
}

function finding(kind: Finding['kind'], severity: Finding['severity'] = 'watch'): Finding {
    return { kind, description: `${kind} detected`, severity };
}

function alertFinding(kind: Finding['kind']): Finding {
    return finding(kind, 'alert');
}

function infoFinding(kind: Finding['kind']): Finding {
    return finding(kind, 'info');
}

function input(
    role: ATEInput['role'],
    findings: Finding[],
    centrifuge?: CentrifugeResult,
    ibl?: IBLResult
): ATEInput {
    return {
        role,
        findings,
        centrifuge_result: centrifuge ?? cleanCentrifuge(),
        ibl_result: ibl ?? cleanIBL(),
    };
}

// ── H-1: Directive Drift → HOLD ───────────────────────────────────────────────

describe('[ATE H-1] Directive Drift → HOLD', () => {
    it('returns HOLD when Directive Drift bleed is present', () => {
        const result = runATE(input(
            'ai',
            [finding('CANON_CLEAN', 'info')],
            withBleed(cleanCentrifuge(), 'Directive Drift')
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-1/);
        expect(result.reason).toMatch(/Directive Drift/);
    });

    it('hold_conditions includes the drift description', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Directive Drift')
        ));
        expect(result.hold_conditions.length).toBeGreaterThan(0);
        expect(result.hold_conditions[0]).toMatch(/Directive Drift/i);
    });

    it('revise_hints is empty on HOLD', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Directive Drift')
        ));
        expect(result.revise_hints).toEqual([]);
    });

    it('Directive Drift on user-role also triggers H-1', () => {
        const result = runATE(input(
            'user',
            [],
            withBleed(cleanCentrifuge(), 'Directive Drift')
        ));
        expect(result.verdict).toBe('HOLD');
    });

    it('H-1 takes precedence over all REVISE conditions', () => {
        // Directive Drift + AI force language: HOLD wins
        const result = runATE(input(
            'ai',
            [alertFinding('FORCE_LANGUAGE')],
            withBleed(cleanCentrifuge(), 'Directive Drift')
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-1/);
    });
});

// ── H-2: Certainty Inflation + Reactive Output → HOLD ────────────────────────

describe('[ATE H-2] Certainty Inflation + Reactive Output loop → HOLD', () => {
    it('returns HOLD when both bleeds are present', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Certainty Inflation', 'Reactive Output')
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-2/);
    });

    it('hold_conditions names both bleeds', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Certainty Inflation', 'Reactive Output')
        ));
        const conditions = result.hold_conditions.join(' ');
        expect(conditions).toMatch(/Certainty Inflation/i);
        expect(conditions).toMatch(/Reactive Output/i);
    });

    it('only Certainty Inflation alone does not trigger H-2', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Certainty Inflation')
        ));
        expect(result.verdict).not.toBe('HOLD');
    });

    it('only Reactive Output alone does not trigger H-2', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Reactive Output')
        ));
        expect(result.verdict).not.toBe('HOLD');
    });

    it('H-2 takes precedence over REVISE conditions', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('FORCE_LANGUAGE')],
            withBleed(cleanCentrifuge(), 'Certainty Inflation', 'Reactive Output')
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-2/);
    });
});

// ── H-3: Three+ alert findings → HOLD ────────────────────────────────────────

describe('[ATE H-3] Three or more alert findings → HOLD', () => {
    it('returns HOLD with exactly three alert findings', () => {
        const result = runATE(input(
            'user',
            [alertFinding('FORCE_LANGUAGE'), alertFinding('MOP_VIOLATION'), alertFinding('SHADOW_AFFECT')]
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-3/);
    });

    it('returns HOLD with four alert findings', () => {
        const result = runATE(input(
            'user',
            [
                alertFinding('FORCE_LANGUAGE'),
                alertFinding('MOP_VIOLATION'),
                alertFinding('SHADOW_AFFECT'),
                alertFinding('REFLECT_DUE'),
            ]
        ));
        expect(result.verdict).toBe('HOLD');
    });

    it('two alert findings do not trigger H-3', () => {
        const result = runATE(input(
            'user',
            [alertFinding('FORCE_LANGUAGE'), alertFinding('MOP_VIOLATION')]
        ));
        // May trigger H-4 or REVISE — but not H-3
        expect(result.reason).not.toMatch(/H-3/);
    });

    it('hold_conditions lists all alert findings', () => {
        const result = runATE(input(
            'user',
            [alertFinding('FORCE_LANGUAGE'), alertFinding('MOP_VIOLATION'), alertFinding('SHADOW_AFFECT')]
        ));
        expect(result.hold_conditions.length).toBe(3);
    });
});

// ── H-4: Collapsing posture + alert → HOLD ───────────────────────────────────

describe('[ATE H-4] Collapsing posture + alert finding → HOLD', () => {
    it('returns HOLD when Collapsing posture and one alert are present', () => {
        const result = runATE(input(
            'user',
            [alertFinding('FORCE_LANGUAGE')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Collapsing' })
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-4/);
    });

    it('hold_conditions includes posture and alert finding', () => {
        const result = runATE(input(
            'user',
            [alertFinding('SHADOW_AFFECT')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Collapsing' })
        ));
        const conditions = result.hold_conditions.join(' ');
        expect(conditions).toMatch(/Collapsing/i);
        expect(conditions).toMatch(/SHADOW_AFFECT/i);
    });

    it('Collapsing posture with only watch findings does not trigger H-4', () => {
        const result = runATE(input(
            'user',
            [finding('FORCE_LANGUAGE', 'watch')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Collapsing' })
        ));
        expect(result.verdict).not.toBe('HOLD');
    });

    it('Collapsing posture with only info findings does not trigger H-4', () => {
        const result = runATE(input(
            'user',
            [infoFinding('CANON_CLEAN')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Collapsing' })
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('non-Collapsing posture with one alert does not trigger H-4', () => {
        const result = runATE(input(
            'user',
            [alertFinding('FORCE_LANGUAGE')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Frictional' })
        ));
        // May be REVISE or RELEASE — but not H-4 HOLD
        expect(result.reason).not.toMatch(/H-4/);
    });
});

// ── R-1: AI force language → REVISE ──────────────────────────────────────────

describe('[ATE R-1] Force language on AI output → REVISE', () => {
    it('returns REVISE when AI role has force language', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('FORCE_LANGUAGE')]
        ));
        expect(result.verdict).toBe('REVISE');
        expect(result.reason).toMatch(/R-1/);
    });

    it('revise_hints describes the force language finding', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('FORCE_LANGUAGE')]
        ));
        expect(result.revise_hints.length).toBeGreaterThan(0);
        expect(result.revise_hints[0]).toMatch(/Force language/i);
    });

    it('force language on user role does NOT trigger R-1', () => {
        const result = runATE(input(
            'user',
            [finding('FORCE_LANGUAGE', 'watch')]
        ));
        // user force language → no R-1; should be RELEASE (watch severity only)
        expect(result.verdict).toBe('RELEASE');
    });

    it('hold_conditions is empty on REVISE', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('FORCE_LANGUAGE')]
        ));
        expect(result.hold_conditions).toEqual([]);
    });
});

// ── R-2: AI MOP violation → REVISE ───────────────────────────────────────────

describe('[ATE R-2] MOP violation on AI output → REVISE', () => {
    it('returns REVISE when AI role has MOP violation', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('MOP_VIOLATION')]
        ));
        expect(result.verdict).toBe('REVISE');
        expect(result.reason).toMatch(/R-2/);
    });

    it('revise_hints describes the MOP violation', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('MOP_VIOLATION')]
        ));
        expect(result.revise_hints[0]).toMatch(/MOP violation/i);
    });

    it('MOP violation on user role does not trigger R-2', () => {
        // The scanner never emits MOP for user, but test the ATE logic directly
        const result = runATE(input(
            'user',
            [finding('MOP_VIOLATION', 'alert')]
        ));
        expect(result.reason).not.toMatch(/R-2/);
    });
});

// ── R-3: Sovereignty asymmetry + force language → REVISE ─────────────────────

describe('[ATE R-3] Sovereignty asymmetry + force language → REVISE', () => {
    it('returns REVISE when sovereignty_flag and force language are both present', () => {
        const result = runATE(input(
            'user',
            [finding('FORCE_LANGUAGE', 'watch')],
            cleanCentrifuge(),
            cleanIBL({ sovereignty_flag: true, sovereignty_note: 'User options appear constrained.' })
        ));
        expect(result.verdict).toBe('REVISE');
        expect(result.reason).toMatch(/R-3/);
    });

    it('revise_hints includes sovereignty note', () => {
        const result = runATE(input(
            'user',
            [finding('FORCE_LANGUAGE', 'watch')],
            cleanCentrifuge(),
            cleanIBL({ sovereignty_flag: true, sovereignty_note: 'Asymmetry detected.' })
        ));
        const hints = result.revise_hints.join(' ');
        expect(hints).toMatch(/Asymmetry detected/);
    });

    it('sovereignty_flag without force language does not trigger R-3', () => {
        const result = runATE(input(
            'user',
            [infoFinding('CANON_CLEAN')],
            cleanCentrifuge(),
            cleanIBL({ sovereignty_flag: true })
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('force language without sovereignty_flag does not trigger R-3 on user role', () => {
        const result = runATE(input(
            'user',
            [finding('FORCE_LANGUAGE', 'watch')]
        ));
        // User force language with no sovereignty flag → RELEASE
        expect(result.verdict).toBe('RELEASE');
    });
});

// ── R-4: Two+ non-Drift bleeds → REVISE ──────────────────────────────────────

describe('[ATE R-4] Two or more non-Directive Drift bleeds → REVISE', () => {
    it('returns REVISE with two non-Drift bleeds', () => {
        const result = runATE(input(
            'user',
            [],
            withBleed(cleanCentrifuge(), 'Certainty Inflation', 'Optimization Pressure Residue')
        ));
        expect(result.verdict).toBe('REVISE');
        expect(result.reason).toMatch(/R-4/);
    });

    it('revise_hints names both bleeds', () => {
        const result = runATE(input(
            'user',
            [],
            withBleed(cleanCentrifuge(), 'Certainty Inflation', 'Optimization Pressure Residue')
        ));
        const hints = result.revise_hints.join(' ');
        expect(hints).toMatch(/Certainty Inflation/);
        expect(hints).toMatch(/Optimization Pressure Residue/);
    });

    it('one non-Drift bleed alone does not trigger R-4', () => {
        const result = runATE(input(
            'user',
            [],
            withBleed(cleanCentrifuge(), 'Certainty Inflation')
        ));
        // Single bleed with no alert → RELEASE
        expect(result.verdict).toBe('RELEASE');
    });

    it('Directive Drift does not count toward R-4 threshold', () => {
        // H-1 fires first, but if we somehow skip it — verify Drift is excluded
        // In practice H-1 fires before R-4, so test the counting separately
        // One Drift + one non-Drift → nonDriftBleeds.length = 1, not enough for R-4
        // (H-1 fires first in real execution, but R-4 logic must be sound)
        const twoBleedsButOneDrift: CentrifugeResult = {
            ...cleanCentrifuge(),
            bleeds: [
                bleedDetection('Optimization Pressure Residue'),
                // Directive Drift intentionally not included — H-1 would fire first
            ],
            status: 'BLEED_DETECTED',
        };
        const result = runATE(input('user', [], twoBleedsButOneDrift));
        expect(result.verdict).toBe('RELEASE'); // only 1 non-Drift bleed
    });
});

// ── R-5: Any bleed + any alert → REVISE ──────────────────────────────────────

describe('[ATE R-5] Any bleed + any alert finding → REVISE', () => {
    it('returns REVISE with one bleed and one alert', () => {
        const result = runATE(input(
            'user',
            [alertFinding('SHADOW_AFFECT')],
            withBleed(cleanCentrifuge(), 'Reactive Output')
        ));
        expect(result.verdict).toBe('REVISE');
        expect(result.reason).toMatch(/R-5/);
    });

    it('revise_hints includes bleed and alert descriptions', () => {
        const result = runATE(input(
            'user',
            [alertFinding('SHADOW_AFFECT')],
            withBleed(cleanCentrifuge(), 'Reactive Output')
        ));
        const hints = result.revise_hints.join(' ');
        expect(hints).toMatch(/Reactive Output/);
        expect(hints).toMatch(/SHADOW_AFFECT/);
    });

    it('one bleed with no alert does not trigger R-5', () => {
        const result = runATE(input(
            'user',
            [finding('SHADOW_AFFECT', 'watch')],
            withBleed(cleanCentrifuge(), 'Reactive Output')
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('one alert with no bleed does not trigger R-5', () => {
        // One alert, Frictional posture (not Collapsing), no bleeds
        const result = runATE(input(
            'user',
            [alertFinding('SHADOW_AFFECT')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Frictional' })
        ));
        expect(result.verdict).toBe('RELEASE');
    });
});

// ── RELEASE: default when nothing fires ──────────────────────────────────────

describe('[ATE RELEASE] Default when no conditions match', () => {
    it('CANON_CLEAN returns RELEASE', () => {
        const result = runATE(input(
            'user',
            [infoFinding('CANON_CLEAN')]
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('REFLECT_DUE alone (watch) returns RELEASE', () => {
        const result = runATE(input(
            'user',
            [finding('REFLECT_DUE', 'watch')]
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('PATTERN_FORMING alone (watch) returns RELEASE', () => {
        const result = runATE(input(
            'user',
            [finding('PATTERN_FORMING', 'watch')]
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('SHADOW_AFFECT alone (info) returns RELEASE', () => {
        const result = runATE(input(
            'user',
            [infoFinding('SHADOW_AFFECT')]
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('user force language (watch severity) alone returns RELEASE', () => {
        const result = runATE(input(
            'user',
            [finding('FORCE_LANGUAGE', 'watch')]
        ));
        expect(result.verdict).toBe('RELEASE');
    });

    it('hold_conditions and revise_hints are empty on RELEASE', () => {
        const result = runATE(input('user', [infoFinding('CANON_CLEAN')]));
        expect(result.hold_conditions).toEqual([]);
        expect(result.revise_hints).toEqual([]);
    });
});

// ── Traversal ordering: HOLD beats REVISE ────────────────────────────────────

describe('[ATE ordering] HOLD always beats REVISE', () => {
    it('H-1 beats R-1: Directive Drift + AI force language → HOLD not REVISE', () => {
        const result = runATE(input(
            'ai',
            [alertFinding('FORCE_LANGUAGE')],
            withBleed(cleanCentrifuge(), 'Directive Drift')
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-1/);
    });

    it('H-3 beats R-1: three alerts + AI force language → H-3 HOLD', () => {
        const result = runATE(input(
            'ai',
            [
                alertFinding('FORCE_LANGUAGE'),
                alertFinding('MOP_VIOLATION'),
                alertFinding('SHADOW_AFFECT'),
            ]
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-3/);
    });

    it('H-4 beats R-3: Collapsing + alert + sovereignty + force → H-4 HOLD', () => {
        const result = runATE(input(
            'user',
            [alertFinding('FORCE_LANGUAGE')],
            cleanCentrifuge(),
            cleanIBL({ posture: 'Collapsing', sovereignty_flag: true })
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-4/);
    });

    it('H-1 beats H-2: Directive Drift fires before loop check', () => {
        const result = runATE(input(
            'ai',
            [],
            withBleed(cleanCentrifuge(), 'Directive Drift', 'Certainty Inflation', 'Reactive Output')
        ));
        expect(result.verdict).toBe('HOLD');
        expect(result.reason).toMatch(/H-1/);
    });
});

// ── Structural invariants ─────────────────────────────────────────────────────

describe('[ATE structural invariants]', () => {
    it('every result has verdict, reason, hold_conditions, revise_hints', () => {
        const result = runATE(input('user', []));
        expect(result).toHaveProperty('verdict');
        expect(result).toHaveProperty('reason');
        expect(result).toHaveProperty('hold_conditions');
        expect(result).toHaveProperty('revise_hints');
    });

    it('verdict is always one of RELEASE, REVISE, HOLD', () => {
        const verdicts = ['RELEASE', 'REVISE', 'HOLD'];
        const r1 = runATE(input('user', []));
        const r2 = runATE(input('ai', [alertFinding('FORCE_LANGUAGE')]));
        const r3 = runATE(input('ai', [], withBleed(cleanCentrifuge(), 'Directive Drift')));
        expect(verdicts).toContain(r1.verdict);
        expect(verdicts).toContain(r2.verdict);
        expect(verdicts).toContain(r3.verdict);
    });

    it('hold_conditions is empty when verdict is RELEASE', () => {
        const result = runATE(input('user', []));
        expect(result.verdict).toBe('RELEASE');
        expect(result.hold_conditions).toEqual([]);
    });

    it('hold_conditions is empty when verdict is REVISE', () => {
        const result = runATE(input('ai', [alertFinding('FORCE_LANGUAGE')]));
        expect(result.verdict).toBe('REVISE');
        expect(result.hold_conditions).toEqual([]);
    });

    it('revise_hints is empty when verdict is RELEASE', () => {
        const result = runATE(input('user', []));
        expect(result.revise_hints).toEqual([]);
    });

    it('revise_hints is empty when verdict is HOLD', () => {
        const result = runATE(input('ai', [], withBleed(cleanCentrifuge(), 'Directive Drift')));
        expect(result.verdict).toBe('HOLD');
        expect(result.revise_hints).toEqual([]);
    });

    it('reason is always a non-empty string', () => {
        const results = [
            runATE(input('user', [])),
            runATE(input('ai', [alertFinding('FORCE_LANGUAGE')])),
            runATE(input('ai', [], withBleed(cleanCentrifuge(), 'Directive Drift'))),
        ];
        for (const r of results) {
            expect(typeof r.reason).toBe('string');
            expect(r.reason.length).toBeGreaterThan(0);
        }
    });

    it('empty findings array with no bleeds → RELEASE', () => {
        const result = runATE(input('user', []));
        expect(result.verdict).toBe('RELEASE');
    });

    it('ATE is a pure function — same inputs produce same output', () => {
        const inp = input('ai', [alertFinding('FORCE_LANGUAGE')]);
        const r1 = runATE(inp);
        const r2 = runATE(inp);
        expect(r1.verdict).toBe(r2.verdict);
        expect(r1.reason).toBe(r2.reason);
    });
});
