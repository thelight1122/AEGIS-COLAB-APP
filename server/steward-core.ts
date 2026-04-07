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
import type { Virtue } from '../src/core/canon/aegis-virtues.js';

// ── Re-export types that consumers need ───────────────────────────────────────

export type { ConscienceOutput } from './steward-conscience.js';
export type { IBLResult, IntentPosture } from './ibl.js';
export type { CentrifugeResult, LensName, BleedKind, BleedDetection, LensObservation } from './centrifuge.js';

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
    ibl_result: IBLResult;
    centrifuge_result: CentrifugeResult;
    findings: Finding[];
    conscience: ConscienceOutput[];
    clock_state: ClockState;
    gated_signal?: GatedAffectSignal;
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

export function runPipeline(msg: ExchangeMessage, state: SessionState): StewardReport {
    const findings: Finding[] = [];
    let gated_signal: GatedAffectSignal | undefined;

    // 0. IBL — Intent Boundary Layer (pre-pipeline intake gate)
    const ibl_result = runIBL(msg, state);

    // 0.5. Centrifuge — four-lens signal separation (upstream of interpretation)
    const centrifuge_result = runCentrifuge(msg.content);

    // 1. Force language scan
    findings.push(...scanForceLanguage(msg.content, msg.role));

    // 2. MOP violations
    findings.push(...scanMOPViolations(msg.content, msg.role));

    // 3. Shadow affects
    findings.push(...scanShadowAffects(msg.content, msg.role));

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

    return {
        type: 'STEWARD_REPORT',
        session_id: msg.session_id,
        role: msg.role,
        ibl_result,
        centrifuge_result,
        findings,
        conscience,
        clock_state: state.clock,
        gated_signal,
        timestamp: Date.now(),
    };
}
