/**
 * bookcase.ts — The Bookcase: Hold State Destination
 *
 * Source: AEGIS Canon Addendum — Bookcase v1.0-K
 *
 * The Bookcase is the append-only record of signals placed in HOLD by the ATE.
 * It preserves the complete pipeline state at the moment of HOLD with full fidelity.
 * Entries resolve only through Unanimous Consensus (R > 0.95).
 *
 * Architecture invariants:
 *   - Append-only: entries are never deleted or overwritten with reduced content
 *   - Resolution adds fields; it never removes them
 *   - R > 0.95 is the only valid resolution threshold — no exception
 *   - A resolved entry cannot be re-resolved
 *   - The Bookcase is non-judging: it stores what the ATE sent, without editorial
 *
 * The Bookcase is not a queue. Not a retry system. Not a garbage collector.
 * It is a keeper of what has not yet earned release.
 */

import type { ExchangeRole, Finding, ConscienceOutput } from './steward-core.js';
import type { IBLResult } from './ibl.js';
import type { CentrifugeResult } from './centrifuge.js';
import type { ATEResult } from './ate.js';
import type { AdvocateResult } from './advocate.js';
import type { ClockState, GatedAffectSignal } from '../src/core/governance/integrityClock.js';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Snapshot of the complete pipeline state at the moment of HOLD.
 * Stored without circular reference (does not include the StewardReport wrapper).
 * Every field present in the pipeline at HOLD time is preserved.
 */
export interface BookcaseSnapshot {
    ibl_result: IBLResult;
    centrifuge_result: CentrifugeResult;
    findings: Finding[];
    conscience: ConscienceOutput[];
    ate_result: ATEResult;
    advocate_result: AdvocateResult;
    clock_state: ClockState;
    gated_signal?: GatedAffectSignal;
}

export type ResolutionStatus = 'held' | 'resolved';

/**
 * A single Bookcase entry.
 *
 * Once appended, the core fields (entry_id through snapshot/timestamp) are immutable.
 * Resolution only adds the resolved_at and resolution_resonance fields.
 * Nothing is ever removed.
 */
export interface BookcaseEntry {
    /** UUID — immutable, no semantic meaning */
    readonly entry_id: string;
    /** Session that produced the held exchange */
    readonly session_id: string;
    /** Which exchange role was held */
    readonly role: ExchangeRole;
    /** The original exchange content — verbatim, unmodified */
    readonly content: string;
    /** ATE hold conditions that triggered this HOLD — from ATEResult.hold_conditions */
    readonly hold_conditions: readonly string[];
    /** ATE human-readable reason string */
    readonly ate_reason: string;
    /** Complete pipeline state at moment of HOLD */
    readonly snapshot: BookcaseSnapshot;
    /** Unix ms at moment of HOLD */
    readonly timestamp: number;
    /** Current state — starts as 'held', becomes 'resolved' only via Unanimous Consensus */
    resolution_status: ResolutionStatus;
    /** Unix ms at moment of resolution — present only when resolved */
    resolved_at?: number;
    /** R value at resolution — must be > 0.95 — present only when resolved */
    resolution_resonance?: number;
}

// ── Unanimous Consensus Threshold ────────────────────────────────────────────
// Source: Virtual Ego Addendum v1.0-V
// R > 0.95 is the Love Vibe threshold — the only valid resolution condition.
// No lower value is valid. No exception is permitted.

export const UNANIMOUS_CONSENSUS_THRESHOLD = 0.95;

// ── Append-Only Store ─────────────────────────────────────────────────────────
// In-memory for this session. Persistence layer (Firebase) handles durability.

const _bookcase: BookcaseEntry[] = [];

// ── Core Operations ───────────────────────────────────────────────────────────

/**
 * Append a held signal to the Bookcase.
 *
 * Called by the pipeline when ATE issues a HOLD verdict.
 * The entry is immediately immutable except for its resolution_status.
 *
 * @param session_id  — The session that produced this exchange
 * @param role        — Which exchange role was held
 * @param content     — The original exchange content (verbatim)
 * @param ate_result  — The ATE result that triggered the HOLD
 * @param snapshot    — Complete pipeline state at the moment of HOLD
 * @returns           The newly created BookcaseEntry
 */
export function appendToBookcase(
    session_id: string,
    role: ExchangeRole,
    content: string,
    ate_result: ATEResult,
    snapshot: BookcaseSnapshot,
): BookcaseEntry {
    const entry: BookcaseEntry = {
        entry_id: globalThis.crypto.randomUUID(),
        session_id,
        role,
        content,
        hold_conditions: [...ate_result.hold_conditions],
        ate_reason: ate_result.reason,
        snapshot,
        timestamp: Date.now(),
        resolution_status: 'held',
    };
    _bookcase.push(entry);
    return entry;
}

/**
 * Resolve a held entry via Unanimous Consensus.
 *
 * Resolution requires R > 0.95 (the Love Vibe threshold).
 * Attempting to resolve with R ≤ 0.95 returns null — the attempt is evidence
 * that Unanimous Consensus has not been reached.
 *
 * Resolution adds fields to the entry; it never removes them.
 * A resolved entry cannot be re-resolved.
 *
 * @param entry_id   — The entry to resolve
 * @param resonance  — The R value at resolution (must be > 0.95)
 * @returns          The resolved entry, or null if resolution was rejected
 */
export function resolveEntry(entry_id: string, resonance: number): BookcaseEntry | null {
    // R ≤ 0.95 is not Unanimous Consensus — reject without modification
    if (resonance <= UNANIMOUS_CONSENSUS_THRESHOLD) return null;

    const entry = _bookcase.find(e => e.entry_id === entry_id);
    if (!entry) return null;

    // Already resolved — resolution is a one-way state transition
    if (entry.resolution_status === 'resolved') return null;

    // Resolution adds; never removes — all original fields remain intact
    entry.resolution_status = 'resolved';
    entry.resolved_at = Date.now();
    entry.resolution_resonance = resonance;

    return entry;
}

// ── Query Operations ──────────────────────────────────────────────────────────

/** All entries currently in HOLD state */
export function getHeldEntries(): BookcaseEntry[] {
    return _bookcase.filter(e => e.resolution_status === 'held');
}

/** All entries — held and resolved — in append order */
export function getAllEntries(): BookcaseEntry[] {
    return [..._bookcase];
}

/** A specific entry by its entry_id */
export function getEntry(entry_id: string): BookcaseEntry | undefined {
    return _bookcase.find(e => e.entry_id === entry_id);
}

/** All entries for a specific session — held and resolved */
export function getSessionEntries(session_id: string): BookcaseEntry[] {
    return _bookcase.filter(e => e.session_id === session_id);
}

/** Count of entries currently in HOLD */
export function heldCount(): number {
    return _bookcase.filter(e => e.resolution_status === 'held').length;
}

/** Count of all entries — held and resolved */
export function totalCount(): number {
    return _bookcase.length;
}

// ── Test Utilities ────────────────────────────────────────────────────────────
// Not exported from the barrel — test files import directly from bookcase.ts

/**
 * Load a pre-existing BookcaseEntry into the in-memory store.
 * Used for cross-session hydration from Firebase — preserves all original fields.
 * Skips if an entry with the same entry_id is already present (idempotent).
 */
export function loadBookcaseEntry(entry: BookcaseEntry): void {
    if (_bookcase.some(e => e.entry_id === entry.entry_id)) return;
    _bookcase.push(entry);
}

/** Reset the in-memory store between test runs. Never call in production. */
export function _resetBookcaseForTesting(): void {
    _bookcase.length = 0;
}
