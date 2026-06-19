/**
 * steward-core.ts — Steward Core Pipeline (no side effects)
 *
 * This module contains all pipeline logic, types, and session management
 * with zero side effects on import. No WebSocket server is started here.
 *
 * Importable by tests without triggering the daemon.
 * The daemon (steward.ts) imports this and wraps it in a WebSocket server.
 *
 * Separation principle:
 *   steward-core.ts  — what the Steward does (pure logic)
 *   steward.ts       — how the Steward listens (WebSocket transport)
 *   steward-scanners.ts  — the four detection passes (individually testable)
 *   steward-conscience.ts — the conscience engine (IDS/IDR/IDQRA)
 */

import {
    runIntegrityCoherenceGate,
    tickClock,
    resetClock,
    type ClockState,
    type RawAffectSignal,
    type GatedAffectSignal,
} from '../src/core/governance/integrityClock.js';
import { runConscienceEngine, type ConscienceOutput } from './steward-conscience.js';
import {
    scanForceLanguage,
    scanMOPViolations,
    scanShadowAffects,
    trackPattern,
} from './steward-scanners.js';
import { runIBL, type IBLResult } from './ibl.js';
import { runCentrifuge, type CentrifugeResult } from './centrifuge.js';
import { runATE, type ATEResult } from './ate.js';
import { runAdvocate, type AdvocateResult } from './advocate.js';
import {
    appendToBookcase,
    type BookcaseSnapshot,
} from './bookcase.js';
import { recordPeerEntry, type PeerEntry } from './peer.js';
import { checkEntry, type PromoterResult } from './peer-spine-promoter.js';
import type { Virtue } from '../src/core/canon/aegis-virtues.js';

// ── Re-export types that consumers need ───────────────────────────────────────

export type { ConscienceOutput } from './steward-conscience.js';
export type { IBLResult, IntentPosture } from './ibl.js';
export type { CentrifugeResult, LensName, BleedKind, BleedDetection, LensObservation } from './centrifuge.js';
export type { ATEResult, ATEVerdict } from './ate.js';
export type {
    AdvocateResult,
    SoulQuality,
    VirtuePresence,
    DissonanceMarker,
    DissonanceQuality,
    DominantAxis,
} from './advocate.js';
export type { BookcaseEntry, BookcaseSnapshot, ResolutionStatus } from './bookcase.js';
export type { PeerEntry, NoiseType, SignalDiscrepancy, InteractionContext, AffectivePresence, ResolutionState, ObserverConfidence } from './peer.js';
export type { PromoterResult, PatternCluster, PatternStatus } from './peer-spine-promoter.js';
export type { SpineEntry, StabilityScore } from './spine.js';

// ── Message Protocol ──────────────────────────────────────────────────────────

export type ExchangeRole = 'user' | 'ai';

export interface ExchangeMessage {
    type: 'EXCHANGE';
    session_id: string;
    role: ExchangeRole;
    content: string;
    affect_hint?: {
        label: string;
        intensity: number;   // 0–1
        direction: number;   // −π to π
        trigger: string;
    };
}

export interface SessionResetMessage {
    type: 'SESSION_RESET';
    session_id: string;
}

export type StewardIncoming = ExchangeMessage | SessionResetMessage;

export type FindingKind =
    | 'FORCE_LANGUAGE'
    | 'MOP_VIOLATION'
    | 'SHADOW_AFFECT'
    | 'REFLECT_DUE'
    | 'PATTERN_FORMING'
    | 'CANON_CLEAN';

export interface Finding {
    kind: FindingKind;
    description: string;
    severity: 'info' | 'watch' | 'alert';
    virtue?: Virtue;
    word?: string;
}

export interface StewardReport {
    type: 'STEWARD_REPORT';
    session_id: string;
    role: ExchangeRole;
    // ── Shared upstream (both faculties read from these) ──────────────────────
    ibl_result: IBLResult;
    centrifuge_result: CentrifugeResult;
    // ── Steward: Conscience / Logic axis (NCT + PCT) ──────────────────────────
    findings: Finding[];
    conscience: ConscienceOutput[];
    ate_result: ATEResult;
    // ── Advocate: Soul / Emotion axis (SPINE + PEER) ──────────────────────────
    advocate_result: AdvocateResult;
    // ── Clock and gated signal ─────────────────────────────────────────────────
    clock_state: ClockState;
    gated_signal?: GatedAffectSignal;
    // ── PEER / SPINE — Soul axis (long-term pattern tracking) ─────────────────
    peer_entry: PeerEntry;
    promoter_result: PromoterResult;
    // ── Bookcase routing (set when ATE verdict is HOLD) ───────────────────────
    bookcase_entry_id?: string;
    timestamp: number;
}

// ── Per-session state ─────────────────────────────────────────────────────────

export interface SessionState {
    clock: ClockState;
    virtue_counts: Partial<Record<Virtue, number>>;
}

export const sessions = new Map<string, SessionState>();

export function getSession(session_id: string): SessionState {
    if (!sessions.has(session_id)) {
        sessions.set(session_id, {
            clock: resetClock(session_id),
            virtue_counts: {},
        });
    }
    return sessions.get(session_id)!;
}

export function resetSession(session_id: string): void {
    sessions.set(session_id, {
        clock: resetClock(session_id),
        virtue_counts: {},
    });
}

// ── Autonomic Pipeline ────────────────────────────────────────────────────────
// Pure function over message + mutable session state.
// No WebSocket. No transport. No side effects.
// Tests import and call this directly.

export async function runPipeline(msg: ExchangeMessage, state: SessionState): Promise<StewardReport> {
    const findings: Finding[] = [];
    let gated_signal: GatedAffectSignal | undefined;

    // 0. IBL & Centrifuge concurrent passes
    const [ibl_result, centrifuge_result] = await Promise.all([
        Promise.resolve(runIBL(msg, state)),
        Promise.resolve(runCentrifuge(msg.content)),
    ]);

    // 0.6. PEER — record this exchange as an experiential entry
    // Creates an incident-level record before pattern matching.
    // Append-only: every exchange is preserved regardless of signal quality.
    const peer_entry = recordPeerEntry({
        role: msg.role,
        ibl_result,
        centrifuge_result,
        affect_intensity: msg.affect_hint?.intensity,
    });

    // 0.65. Promoter — check recurrence thresholds against PEER pattern clusters
    // Candidate threshold (X≥3, Y≥2, Z≤30d) → IDS reflection signal
    // Promotion threshold (X≥7, Y≥3, Z≤90d) → SPINE entry written
    const promoter_result = checkEntry(peer_entry);

    if (promoter_result.promotion_threshold_crossed && promoter_result.spine_entry) {
        findings.push({
            kind: 'PATTERN_FORMING',
            description: `SPINE promotion — pattern "${peer_entry.observed_noise_type}" reached structural threshold (${promoter_result.occurrence_count} occurrences, ${promoter_result.context_count} contexts). Entry written to SPINE.`,
            severity: 'watch',
        });
    } else if (promoter_result.candidate_threshold_crossed) {
        findings.push({
            kind: 'PATTERN_FORMING',
            description: `Candidate pattern threshold crossed — "${peer_entry.observed_noise_type}" recurring across ${promoter_result.context_count} context(s) (${promoter_result.occurrence_count} occurrences). IDS reflection warranted.`,
            severity: 'info',
        });
    }

    // 0.7. Advocate & Scans concurrent passes
    const [advocate_result, forceFindings, mopFindings, shadowFindings] = await Promise.all([
        Promise.resolve(runAdvocate({
            content: msg.content,
            role: msg.role,
            affect_hint: msg.affect_hint,
            centrifuge_result,
            ibl_result,
            session_state: state,
        })),
        Promise.resolve(scanForceLanguage(msg.content, msg.role)),
        Promise.resolve(scanMOPViolations(msg.content, msg.role)),
        Promise.resolve(scanShadowAffects(msg.content, msg.role)),
    ]);

    // Add findings from parallel scans
    findings.push(...forceFindings);
    findings.push(...mopFindings);
    findings.push(...shadowFindings);

    // 4. Integrity Coherence Gate — requires affect hint
    if (msg.affect_hint) {
        const raw: RawAffectSignal = {
            affect_label: msg.affect_hint.label,
            intensity: msg.affect_hint.intensity,
            direction: msg.affect_hint.direction,
            trigger: msg.affect_hint.trigger,
            session_id: msg.session_id,
        };
        gated_signal = runIntegrityCoherenceGate(raw);

        // 5. Clock tick
        state.clock = tickClock(state.clock, gated_signal);

        // Reflect due?
        if (state.clock.reflect_due) {
            findings.push({
                kind: 'REFLECT_DUE',
                description: `Reflect Session due — accumulated weight ${state.clock.accumulated_weight.toFixed(1)} / ${state.clock.reflect_threshold}. Dominant virtue: ${state.clock.dominant_virtue ?? 'none'}.`,
                severity: 'watch',
                virtue: state.clock.dominant_virtue ?? undefined,
            });
        }

        // 6. Pattern tracking
        findings.push(...trackPattern(state, gated_signal));
    }

    // Canon clean?
    if (findings.length === 0) {
        findings.push({
            kind: 'CANON_CLEAN',
            description: 'No violations detected. Exchange is within Canon integrity.',
            severity: 'info',
        });
    }

    // Run conscience engine on each finding.
    // CANON_CLEAN findings return null — no conscience output needed.
    const conscience: ConscienceOutput[] = findings
        .map(f => runConscienceEngine(f))
        .filter((c): c is ConscienceOutput => c !== null);

    // 7. ATE — Axiomatic Traversal Engine (output verdict gate)
    const ate_result = runATE({
        role: msg.role,
        findings,
        centrifuge_result,
        ibl_result,
    });

    // 8. Bookcase routing — if ATE issued HOLD, append to Bookcase.
    // The snapshot captures the complete pipeline state without circular reference.
    let bookcase_entry_id: string | undefined;
    if (ate_result.verdict === 'HOLD') {
        const snapshot: BookcaseSnapshot = {
            ibl_result,
            centrifuge_result,
            findings,
            conscience,
            ate_result,
            advocate_result,
            clock_state: state.clock,
            gated_signal,
        };
        const entry = appendToBookcase(
            msg.session_id,
            msg.role,
            msg.content,
            ate_result,
            snapshot,
        );
        bookcase_entry_id = entry.entry_id;
    }

    return {
        type: 'STEWARD_REPORT',
        session_id: msg.session_id,
        role: msg.role,
        ibl_result,
        centrifuge_result,
        findings,
        conscience,
        ate_result,
        advocate_result,
        clock_state: state.clock,
        gated_signal,
        peer_entry,
        promoter_result,
        bookcase_entry_id,
        timestamp: Date.now(),
    };
}
