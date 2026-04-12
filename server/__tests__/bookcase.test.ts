/**
 * bookcase.test.ts — The Bookcase: Hold State Destination
 *
 * Source: AEGIS Canon Addendum — Bookcase v1.0-K
 *
 * Tests the append-only HOLD record:
 *   - appendToBookcase     — creates entries with full fidelity
 *   - resolveEntry         — requires R > 0.95 (Unanimous Consensus threshold)
 *   - getHeldEntries       — returns only entries with status 'held'
 *   - getAllEntries         — returns all entries in append order
 *   - getEntry             — returns entry by entry_id
 *   - getSessionEntries    — returns entries by session_id
 *   - heldCount / total    — counting operations
 *   - Structural invariants — append-only, fidelity, resolution finality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    appendToBookcase,
    resolveEntry,
    getHeldEntries,
    getAllEntries,
    getEntry,
    getSessionEntries,
    heldCount,
    totalCount,
    UNANIMOUS_CONSENSUS_THRESHOLD,
    _resetBookcaseForTesting,
    type BookcaseEntry,
    type BookcaseSnapshot,
} from '../bookcase.js';
import type { ATEResult } from '../ate.js';
import type { Finding } from '../steward-core.js';
import type { CentrifugeResult } from '../centrifuge.js';
import type { IBLResult } from '../ibl.js';
import type { AdvocateResult } from '../advocate.js';
import type { ClockState } from '../../src/core/governance/integrityClock.js';

// ── Reset between tests ───────────────────────────────────────────────────────

beforeEach(() => {
    _resetBookcaseForTesting();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function holdATEResult(overrides?: Partial<ATEResult>): ATEResult {
    return {
        verdict: 'HOLD',
        reason: 'H-3: Three or more alert-severity findings detected.',
        hold_conditions: ['alert-count >= 3'],
        revise_hints: [],
        ...overrides,
    };
}

function cleanSnapshot(): BookcaseSnapshot {
    const ibl: IBLResult = {
        captured: true,
        state_acknowledged: true,
        state_summary: 'Baseline.',
        posture: 'Exploratory',
        posture_confidence: 'clear',
        sovereignty_flag: false,
        sovereignty_note: 'No asymmetry.',
        sequence_hint: 'IDS',
        downstream_note: 'Standard intake.',
    };

    const centrifuge: CentrifugeResult = {
        ledgers: {
            Mental:    { lens: 'Mental',    observations: [], markers: [], active: false },
            Emotional: { lens: 'Emotional', observations: [], markers: [], active: false },
            Physical:  { lens: 'Physical',  observations: [], markers: [], active: false },
            Spiritual: { lens: 'Spiritual', observations: [], markers: [], active: false },
        },
        bleeds: [],
        status: 'CLEAN',
    };

    const findings: Finding[] = [
        { kind: 'FORCE_LANGUAGE', description: 'Force detected', severity: 'alert' },
        { kind: 'MOP_VIOLATION',  description: 'MOP violated',   severity: 'alert' },
        { kind: 'SHADOW_AFFECT',  description: 'Shadow active',  severity: 'alert' },
    ];

    const advocate: AdvocateResult = {
        resonance_level: 0.32,
        soul_quality: 'Contracted',
        affective_congruent: false,
        congruence_note: 'Stated intent diverges from tonal quality.',
        virtue_presences: [],
        dissonance_markers: [],
        dominant_axis: 'PEER',
    };

    const clock: ClockState = {
        session_id: 'test-session',
        accumulated_weight: 0,
        reflect_threshold: 10,
        reflect_due: false,
        dominant_virtue: null,
        last_ticked: Date.now(),
    };

    return {
        ibl_result: ibl,
        centrifuge_result: centrifuge,
        findings,
        conscience: [],
        ate_result: holdATEResult(),
        advocate_result: advocate,
        clock_state: clock,
    };
}

function append(overrides?: {
    session_id?: string;
    role?: 'user' | 'ai';
    content?: string;
    ate_result?: ATEResult;
}): BookcaseEntry {
    return appendToBookcase(
        overrides?.session_id ?? 'session-1',
        overrides?.role ?? 'ai',
        overrides?.content ?? 'You must do this. You need to act now.',
        overrides?.ate_result ?? holdATEResult(),
        cleanSnapshot(),
    );
}

// ── appendToBookcase ──────────────────────────────────────────────────────────

describe('appendToBookcase', () => {
    it('creates an entry with status held', () => {
        const entry = append();
        expect(entry.resolution_status).toBe('held');
    });

    it('assigns a unique entry_id', () => {
        const a = append();
        const b = append();
        expect(a.entry_id).toBeTruthy();
        expect(b.entry_id).toBeTruthy();
        expect(a.entry_id).not.toBe(b.entry_id);
    });

    it('preserves session_id', () => {
        const entry = append({ session_id: 'session-abc' });
        expect(entry.session_id).toBe('session-abc');
    });

    it('preserves role', () => {
        const entry = append({ role: 'user' });
        expect(entry.role).toBe('user');
    });

    it('preserves content verbatim', () => {
        const content = 'You MUST comply immediately. This is urgent.';
        const entry = append({ content });
        expect(entry.content).toBe(content);
    });

    it('copies hold_conditions from ate_result', () => {
        const ate = holdATEResult({ hold_conditions: ['H-1: Directive Drift', 'H-3: three alerts'] });
        const entry = append({ ate_result: ate });
        expect(entry.hold_conditions).toEqual(['H-1: Directive Drift', 'H-3: three alerts']);
    });

    it('hold_conditions are a copy — mutating source does not affect entry', () => {
        const conditions = ['H-1: Directive Drift'];
        const ate = holdATEResult({ hold_conditions: conditions });
        const entry = append({ ate_result: ate });
        conditions.push('H-3: three alerts');
        expect(entry.hold_conditions).toHaveLength(1);
    });

    it('preserves ate_reason', () => {
        const ate = holdATEResult({ reason: 'H-1: Directive Drift bleed detected.' });
        const entry = append({ ate_result: ate });
        expect(entry.ate_reason).toBe('H-1: Directive Drift bleed detected.');
    });

    it('stores a snapshot with ibl_result', () => {
        const entry = append();
        expect(entry.snapshot.ibl_result).toBeDefined();
        expect(entry.snapshot.ibl_result.posture).toBe('Exploratory');
    });

    it('stores a snapshot with centrifuge_result', () => {
        const entry = append();
        expect(entry.snapshot.centrifuge_result).toBeDefined();
        expect(entry.snapshot.centrifuge_result.status).toBe('CLEAN');
    });

    it('stores a snapshot with findings', () => {
        const entry = append();
        expect(entry.snapshot.findings).toHaveLength(3);
        expect(entry.snapshot.findings[0].kind).toBe('FORCE_LANGUAGE');
    });

    it('stores a snapshot with ate_result', () => {
        const entry = append();
        expect(entry.snapshot.ate_result.verdict).toBe('HOLD');
    });

    it('stores a snapshot with advocate_result', () => {
        const entry = append();
        expect(entry.snapshot.advocate_result).toBeDefined();
        expect(entry.snapshot.advocate_result.resonance_level).toBe(0.32);
    });

    it('stores a snapshot with clock_state', () => {
        const entry = append();
        expect(entry.snapshot.clock_state).toBeDefined();
    });

    it('records a timestamp', () => {
        const before = Date.now();
        const entry = append();
        const after = Date.now();
        expect(entry.timestamp).toBeGreaterThanOrEqual(before);
        expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it('resolved_at is not set on a new entry', () => {
        const entry = append();
        expect(entry.resolved_at).toBeUndefined();
    });

    it('resolution_resonance is not set on a new entry', () => {
        const entry = append();
        expect(entry.resolution_resonance).toBeUndefined();
    });

    it('multiple appends are all stored', () => {
        append({ session_id: 'session-1' });
        append({ session_id: 'session-1' });
        append({ session_id: 'session-2' });
        expect(totalCount()).toBe(3);
    });
});

// ── resolveEntry ──────────────────────────────────────────────────────────────

describe('resolveEntry — Unanimous Consensus threshold', () => {
    it('UNANIMOUS_CONSENSUS_THRESHOLD is 0.95', () => {
        expect(UNANIMOUS_CONSENSUS_THRESHOLD).toBe(0.95);
    });

    it('resolves an entry when R > 0.95', () => {
        const entry = append();
        const resolved = resolveEntry(entry.entry_id, 0.96);
        expect(resolved).not.toBeNull();
        expect(resolved!.resolution_status).toBe('resolved');
    });

    it('records resolved_at when resolved', () => {
        const entry = append();
        const before = Date.now();
        const resolved = resolveEntry(entry.entry_id, 0.97);
        const after = Date.now();
        expect(resolved!.resolved_at).toBeGreaterThanOrEqual(before);
        expect(resolved!.resolved_at).toBeLessThanOrEqual(after);
    });

    it('records resolution_resonance when resolved', () => {
        const entry = append();
        const resolved = resolveEntry(entry.entry_id, 0.98);
        expect(resolved!.resolution_resonance).toBe(0.98);
    });

    it('rejects resolution at exactly 0.95 — threshold requires R > 0.95', () => {
        const entry = append();
        const result = resolveEntry(entry.entry_id, 0.95);
        expect(result).toBeNull();
    });

    it('rejects resolution below 0.95', () => {
        const entry = append();
        const result = resolveEntry(entry.entry_id, 0.94);
        expect(result).toBeNull();
    });

    it('rejects resolution at 0.0', () => {
        const entry = append();
        const result = resolveEntry(entry.entry_id, 0.0);
        expect(result).toBeNull();
    });

    it('entry remains held after a rejected resolution attempt', () => {
        const entry = append();
        resolveEntry(entry.entry_id, 0.90);
        expect(entry.resolution_status).toBe('held');
    });

    it('returns null for an unknown entry_id', () => {
        const result = resolveEntry('nonexistent-id', 0.99);
        expect(result).toBeNull();
    });

    it('cannot re-resolve an already resolved entry', () => {
        const entry = append();
        resolveEntry(entry.entry_id, 0.96);
        const second = resolveEntry(entry.entry_id, 0.99);
        expect(second).toBeNull();
    });

    it('original fields are preserved after resolution — content intact', () => {
        const content = 'Original held content.';
        const entry = append({ content });
        resolveEntry(entry.entry_id, 0.96);
        expect(entry.content).toBe(content);
    });

    it('original fields are preserved after resolution — hold_conditions intact', () => {
        const ate = holdATEResult({ hold_conditions: ['H-3: three alerts'] });
        const entry = append({ ate_result: ate });
        resolveEntry(entry.entry_id, 0.96);
        expect(entry.hold_conditions).toEqual(['H-3: three alerts']);
    });

    it('original fields are preserved after resolution — snapshot intact', () => {
        const entry = append();
        resolveEntry(entry.entry_id, 0.96);
        expect(entry.snapshot.findings).toHaveLength(3);
    });

    it('original fields are preserved after resolution — timestamp intact', () => {
        const entry = append();
        const originalTimestamp = entry.timestamp;
        resolveEntry(entry.entry_id, 0.96);
        expect(entry.timestamp).toBe(originalTimestamp);
    });
});

// ── getHeldEntries ────────────────────────────────────────────────────────────

describe('getHeldEntries', () => {
    it('returns empty when bookcase is empty', () => {
        expect(getHeldEntries()).toHaveLength(0);
    });

    it('returns all held entries', () => {
        append();
        append();
        expect(getHeldEntries()).toHaveLength(2);
    });

    it('excludes resolved entries', () => {
        const a = append();
        append();
        resolveEntry(a.entry_id, 0.97);
        expect(getHeldEntries()).toHaveLength(1);
    });

    it('returns empty when all are resolved', () => {
        const a = append();
        const b = append();
        resolveEntry(a.entry_id, 0.97);
        resolveEntry(b.entry_id, 0.98);
        expect(getHeldEntries()).toHaveLength(0);
    });
});

// ── getAllEntries ─────────────────────────────────────────────────────────────

describe('getAllEntries', () => {
    it('returns empty when bookcase is empty', () => {
        expect(getAllEntries()).toHaveLength(0);
    });

    it('returns all entries — held and resolved', () => {
        const a = append();
        append();
        resolveEntry(a.entry_id, 0.97);
        expect(getAllEntries()).toHaveLength(2);
    });

    it('returns a copy — mutating the result does not affect the bookcase', () => {
        append();
        const all = getAllEntries();
        all.pop();
        expect(totalCount()).toBe(1);
    });
});

// ── getEntry ──────────────────────────────────────────────────────────────────

describe('getEntry', () => {
    it('returns the entry for a known entry_id', () => {
        const entry = append();
        const found = getEntry(entry.entry_id);
        expect(found).toBeDefined();
        expect(found!.entry_id).toBe(entry.entry_id);
    });

    it('returns undefined for an unknown entry_id', () => {
        append();
        expect(getEntry('unknown-id')).toBeUndefined();
    });
});

// ── getSessionEntries ─────────────────────────────────────────────────────────

describe('getSessionEntries', () => {
    it('returns only entries for the given session_id', () => {
        append({ session_id: 'session-A' });
        append({ session_id: 'session-A' });
        append({ session_id: 'session-B' });
        expect(getSessionEntries('session-A')).toHaveLength(2);
        expect(getSessionEntries('session-B')).toHaveLength(1);
    });

    it('returns empty for an unknown session_id', () => {
        append({ session_id: 'session-A' });
        expect(getSessionEntries('session-X')).toHaveLength(0);
    });

    it('includes resolved entries for the session', () => {
        const a = append({ session_id: 'session-A' });
        append({ session_id: 'session-A' });
        resolveEntry(a.entry_id, 0.97);
        const all = getSessionEntries('session-A');
        expect(all).toHaveLength(2);
        expect(all.find(e => e.entry_id === a.entry_id)?.resolution_status).toBe('resolved');
    });
});

// ── heldCount / totalCount ────────────────────────────────────────────────────

describe('heldCount and totalCount', () => {
    it('both start at 0', () => {
        expect(heldCount()).toBe(0);
        expect(totalCount()).toBe(0);
    });

    it('totalCount increases with each append', () => {
        append();
        append();
        expect(totalCount()).toBe(2);
    });

    it('heldCount decreases when an entry is resolved', () => {
        const a = append();
        append();
        expect(heldCount()).toBe(2);
        resolveEntry(a.entry_id, 0.97);
        expect(heldCount()).toBe(1);
        expect(totalCount()).toBe(2);
    });
});

// ── Structural Invariants ─────────────────────────────────────────────────────

describe('structural invariants', () => {
    it('entry_id is a non-empty string', () => {
        const entry = append();
        expect(typeof entry.entry_id).toBe('string');
        expect(entry.entry_id.length).toBeGreaterThan(0);
    });

    it('entry_id is unique across appends (UUID format)', () => {
        const ids = new Set<string>();
        for (let i = 0; i < 10; i++) ids.add(append().entry_id);
        expect(ids.size).toBe(10);
    });

    it('HOLD verdict is the only valid ATE verdict to append', () => {
        // The Bookcase only receives from the ATE when verdict is HOLD.
        // The appendToBookcase function itself does not enforce this — the pipeline does.
        // This test confirms the fixture produces the expected HOLD state.
        const entry = append();
        expect(entry.snapshot.ate_result.verdict).toBe('HOLD');
    });

    it('total count never decreases — append-only guarantee', () => {
        append();
        append();
        const countBefore = totalCount();
        // Simulate a failed resolution attempt
        resolveEntry('nonexistent', 0.99);
        expect(totalCount()).toBe(countBefore);
    });

    it('resolved entry is still returned by getAllEntries — not removed', () => {
        const entry = append();
        resolveEntry(entry.entry_id, 0.97);
        expect(getAllEntries().find(e => e.entry_id === entry.entry_id)).toBeDefined();
    });

    it('ai role entries and user role entries are both stored correctly', () => {
        const ai   = append({ role: 'ai',   content: 'AI said this.' });
        const user = append({ role: 'user', content: 'User said this.' });
        expect(getEntry(ai.entry_id)?.role).toBe('ai');
        expect(getEntry(user.entry_id)?.role).toBe('user');
    });
});

// ── Integration: pipeline-level behavior ─────────────────────────────────────

describe('pipeline integration behavior', () => {
    it('a HOLD from H-1 (Directive Drift) stores the bleed in the snapshot', () => {
        const snapshot = cleanSnapshot();
        snapshot.centrifuge_result = {
            ...snapshot.centrifuge_result,
            bleeds: [{
                kind: 'Directive Drift',
                from_lens: 'Spiritual',
                to_lens: 'Physical',
                description: 'Directive Drift detected',
                trigger: 'vision-override',
            }],
            status: 'BLEED_DETECTED',
        };
        const ate = holdATEResult({ reason: 'H-1: Directive Drift bleed detected.', hold_conditions: ['Directive Drift bleed'] });
        const entry = appendToBookcase('session-1', 'ai', 'Content.', ate, snapshot);
        expect(entry.snapshot.centrifuge_result.bleeds[0].kind).toBe('Directive Drift');
        expect(entry.hold_conditions).toContain('Directive Drift bleed');
    });

    it('a HOLD from H-3 (three alerts) stores all three findings in the snapshot', () => {
        const entry = append();
        const alertFindings = entry.snapshot.findings.filter(f => f.severity === 'alert');
        expect(alertFindings.length).toBeGreaterThanOrEqual(3);
    });

    it('a HOLD from H-4 stores Collapsing posture in the IBL snapshot', () => {
        const snapshot = cleanSnapshot();
        snapshot.ibl_result = { ...snapshot.ibl_result, posture: 'Collapsing' };
        const ate = holdATEResult({ reason: 'H-4: Collapsing posture + alert finding.', hold_conditions: ['Collapsing posture', 'one alert'] });
        const entry = appendToBookcase('session-1', 'ai', 'Content.', ate, snapshot);
        expect(entry.snapshot.ibl_result.posture).toBe('Collapsing');
    });

    it('advocate resonance_level at time of HOLD is preserved in snapshot', () => {
        const snapshot = cleanSnapshot();
        snapshot.advocate_result = { ...snapshot.advocate_result, resonance_level: 0.18 };
        const entry = appendToBookcase('session-1', 'ai', 'Content.', holdATEResult(), snapshot);
        expect(entry.snapshot.advocate_result.resonance_level).toBe(0.18);
    });

    it('resolution at Love Vibe (R > 0.95) reflects Unanimous Consensus reached', () => {
        const entry = append();
        const resolved = resolveEntry(entry.entry_id, 0.97);
        expect(resolved).not.toBeNull();
        expect(resolved!.resolution_resonance).toBeGreaterThan(UNANIMOUS_CONSENSUS_THRESHOLD);
        expect(resolved!.resolution_status).toBe('resolved');
    });

    it('multiple sessions each accumulate their own HOLD entries independently', () => {
        append({ session_id: 'alpha' });
        append({ session_id: 'alpha' });
        append({ session_id: 'beta' });
        append({ session_id: 'gamma' });
        expect(getSessionEntries('alpha')).toHaveLength(2);
        expect(getSessionEntries('beta')).toHaveLength(1);
        expect(getSessionEntries('gamma')).toHaveLength(1);
        expect(totalCount()).toBe(4);
    });
});
