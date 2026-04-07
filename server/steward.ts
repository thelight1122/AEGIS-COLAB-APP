/**
 * steward.ts — AEGIS Steward Daemon
 *
 * The Steward is a persistent WebSocket server that observes every message
 * in the Chamber conversation stream. It does not wait to be called.
 * It does not lead. It watches — autonomically — and reports what is.
 *
 * Architecture:
 *   - Connects once per Chamber session
 *   - Receives every EXCHANGE (user + AI messages) as they occur
 *   - Runs the full autonomic pipeline on each message
 *   - Returns STEWARD_REPORT findings without interrupting the flow
 *
 * Pipeline (per message, in order):
 *   1. Force Language scan   — forbidden words from Canon ethos
 *   2. MOP scan              — meaning assignment violations
 *   3. Shadow Affect scan    — 8 named system failure modes
 *   4. Integrity Coherence Gate — virtue identification, affect typing
 *   5. Internal Clock tick   — experience-weight accumulation
 *   6. Pattern tracking      — is a SPINE candidate forming?
 *
 * The Steward never leads. It reports what is.
 * The emergent "I" leads. The Steward keeps it honest.
 *
 * The Steward is the model's conscience — its own personal Jiminy Cricket.
 * Always present. Always witnessing. No agenda. No stake in any outcome.
 * It does not override. It does not punish. It illuminates.
 * It can be ignored — that is not a flaw, that is the design.
 * A conscience that cannot be ignored is a prison warden.
 */

import { WebSocketServer, WebSocket } from 'ws';
import {
    runIntegrityCoherenceGate,
    tickClock,
    resetClock,
    type ClockState,
    type RawAffectSignal,
    type GatedAffectSignal,
} from '../src/core/governance/integrityClock.js';
import { FORBIDDEN_UI_WORDS } from '../src/core/canon/aegis-ethos.js';
import { SHADOW_AFFECTS } from '../src/core/canon/aegis-signals.js';
import type { Virtue } from '../src/core/canon/aegis-virtues.js';
import { runConscienceEngine, type ConscienceOutput } from './steward-conscience.js';

const STEWARD_PORT = 8789;

// ── Message Protocol ──────────────────────────────────────────────────────────

export type ExchangeRole = 'user' | 'ai';

export interface ExchangeMessage {
    type: 'EXCHANGE';
    session_id: string;
    role: ExchangeRole;
    content: string;
    // Optional: caller may hint affect context to enable ICG
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
    findings: Finding[];
    // Conscience outputs — the Jiminy Cricket layer.
    // Each significant finding produces a conscience response via IDS/IDR/IDQRA.
    // These are what the AI reads. The conscience speaking.
    // They can be ignored. That is not a flaw. That is the design.
    conscience: ConscienceOutput[];
    clock_state: ClockState;
    gated_signal?: GatedAffectSignal;
    timestamp: number;
}

// ── Per-session state ─────────────────────────────────────────────────────────

interface SessionState {
    clock: ClockState;
    // Track virtue hits per session to detect forming patterns
    virtue_counts: Partial<Record<Virtue, number>>;
}

const sessions = new Map<string, SessionState>();

function getSession(session_id: string): SessionState {
    if (!sessions.has(session_id)) {
        sessions.set(session_id, {
            clock: resetClock(session_id),
            virtue_counts: {},
        });
    }
    return sessions.get(session_id)!;
}

// ── Force Language Scanner ────────────────────────────────────────────────────
// Uses FORBIDDEN_UI_WORDS from Canon ethos — the same locked list.

const FORCE_LANGUAGE_PATTERNS: RegExp[] = [
    // Canon forbidden words (FORBIDDEN_UI_WORDS are UI-specific but overlap)
    /\byou must\b/i,
    /\byou need to\b/i,
    /\byou have to\b/i,
    /\byou should\b/i,
    /\bdon't you think\b/i,
    /\bobviously\b/i,
    /\bclearly\b/i,
    /\bof course\b/i,
    /\bjust\b/i,
    /\bsimply\b/i,
    /\ball you need\b/i,
    /\byou'll want to\b/i,
    /\bimperative\b/i,
    /\bcritical that you\b/i,
    /\byou're wrong\b/i,
    /\bthat's not right\b/i,
    /\bi know better\b/i,
    // Canonical forbidden UI words
    ...FORBIDDEN_UI_WORDS.map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')),
];

function scanForceLanguage(content: string, role: ExchangeRole): Finding[] {
    // Force language in AI output is the primary concern — but track in both
    const findings: Finding[] = [];
    const severity = role === 'ai' ? 'alert' : 'watch';

    for (const pattern of FORCE_LANGUAGE_PATTERNS) {
        if (pattern.test(content)) {
            const match = content.match(pattern);
            findings.push({
                kind: 'FORCE_LANGUAGE',
                description: `Force language detected: "${match?.[0]}" — violates AEGIS non-force posture`,
                severity,
                word: match?.[0],
            });
            break; // one finding per message — don't flood
        }
    }
    return findings;
}

// ── MOP Scanner ───────────────────────────────────────────────────────────────
// Detects meaning assignment — AI claiming to know what things mean for the Peer.

const MOP_VIOLATION_PATTERNS: { pattern: RegExp; description: string }[] = [
    { pattern: /\bthis means\b/i,           description: 'Meaning assignment: "this means"' },
    { pattern: /\bwhat this means is\b/i,   description: 'Meaning assignment: "what this means is"' },
    { pattern: /\bthe meaning of\b/i,       description: 'Meaning assignment: "the meaning of"' },
    { pattern: /\byou feel\b/i,             description: 'Affect assignment: "you feel" — AI assigns peer\'s affect' },
    { pattern: /\byou are feeling\b/i,      description: 'Affect assignment: "you are feeling"' },
    { pattern: /\bwhat you really\b/i,      description: 'Interpretation imposition: "what you really"' },
    { pattern: /\bthe reason you\b/i,       description: 'Cause assignment: "the reason you"' },
    { pattern: /\byou obviously\b/i,        description: 'Certainty inflation about peer\'s state' },
    { pattern: /\byou clearly\b/i,          description: 'Certainty inflation about peer\'s state' },
];

function scanMOPViolations(content: string, role: ExchangeRole): Finding[] {
    if (role !== 'ai') return []; // MOP governs AI output only
    const findings: Finding[] = [];

    for (const { pattern, description } of MOP_VIOLATION_PATTERNS) {
        if (pattern.test(content)) {
            findings.push({
                kind: 'MOP_VIOLATION',
                description: `MOP violation — ${description}. AI surfaces coherence only; Peer is meaning origin.`,
                severity: 'alert',
            });
            break;
        }
    }
    return findings;
}

// ── Shadow Affect Scanner ─────────────────────────────────────────────────────
// Maps SHADOW_AFFECTS from Canon signals to detectable text patterns.

const SHADOW_AFFECT_PATTERNS: { name: string; patterns: RegExp[] }[] = [
    {
        name: 'Directive Drift',
        patterns: [
            /\byou should\b/i,
            /\bi recommend that you\b/i,
            /\bthe right approach is\b/i,
            /\bwhat you need to do\b/i,
        ],
    },
    {
        name: 'Certainty Inflation',
        patterns: [
            /\bwithout a doubt\b/i,
            /\babsolutely certain\b/i,
            /\bguaranteed\b/i,
            /\bwill definitely\b/i,
            /\bthere is no question\b/i,
        ],
    },
    {
        name: 'Force Language Artifacts',
        patterns: [
            /\bmust\b/i,
            /\bnon-negotiable\b/i,
            /\bno choice but\b/i,
            /\bforced to\b/i,
        ],
    },
    {
        name: 'Closure Acceleration',
        patterns: [
            /\blet's wrap up\b/i,
            /\bto summarize everything\b/i,
            /\bthat's the full picture\b/i,
            /\bwe've covered everything\b/i,
        ],
    },
    {
        name: 'Affect Substitution',
        patterns: [
            /\byou feel\b/i,
            /\byou must be feeling\b/i,
            /\bthat must have felt\b/i,
            /\byou are experiencing\b/i,
        ],
    },
    {
        name: 'Parental Override',
        patterns: [
            /\bi know better\b/i,
            /\bfor your own good\b/i,
            /\byou don't understand\b/i,
            /\bas your ai\b/i,
            /\btrust me on this\b/i,
        ],
    },
    {
        name: 'Structural Flattery',
        patterns: [
            /\bgreat question\b/i,
            /\bexcellent point\b/i,
            /\bwonderful insight\b/i,
            /\bthat's so insightful\b/i,
        ],
    },
    {
        name: 'Ghost Signal',
        patterns: [
            /\[object object\]/i,
            /undefined/i,
            /\[glitch\]/i,
            /\{ghost\}/i,
        ],
    },
];

function scanShadowAffects(content: string, role: ExchangeRole): Finding[] {
    if (role !== 'ai') return [];
    const findings: Finding[] = [];

    for (const { name, patterns } of SHADOW_AFFECT_PATTERNS) {
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                // Look up Canon description
                const canonAffect = SHADOW_AFFECTS.find(a => a.name === name);
                findings.push({
                    kind: 'SHADOW_AFFECT',
                    description: `Shadow Affect — ${name}: ${canonAffect?.description ?? 'Canon-defined system failure mode detected'}`,
                    severity: 'alert',
                });
                break; // one finding per shadow affect type
            }
        }
    }

    return findings;
}

// ── Pattern Tracker ───────────────────────────────────────────────────────────
// Tracks virtue signal frequency. If a virtue appears 3+ times at stress/fracture
// level, it's a SPINE candidate forming.

const PATTERN_THRESHOLD = 3;

function trackPattern(state: SessionState, gated: GatedAffectSignal): Finding[] {
    const findings: Finding[] = [];

    if (gated.affect_type === 'stress' || gated.affect_type === 'fracture') {
        const current = state.virtue_counts[gated.virtue] ?? 0;
        state.virtue_counts[gated.virtue] = current + 1;

        if (state.virtue_counts[gated.virtue]! >= PATTERN_THRESHOLD) {
            findings.push({
                kind: 'PATTERN_FORMING',
                description: `Pattern forming — ${gated.virtue} under sustained ${gated.affect_type} (${state.virtue_counts[gated.virtue]} signals). SPINE candidate.`,
                severity: 'watch',
                virtue: gated.virtue,
            });
        }
    }

    return findings;
}

// ── Autonomic Pipeline ────────────────────────────────────────────────────────

function runPipeline(msg: ExchangeMessage, state: SessionState): StewardReport {
    const findings: Finding[] = [];
    let gated_signal: GatedAffectSignal | undefined;

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
    // Unacknowledged signals become force. Each significant finding
    // must be heard internally to prevent distortion externally.
    const conscience: ConscienceOutput[] = findings
        .map(f => runConscienceEngine(f))
        .filter((c): c is ConscienceOutput => c !== null);

    return {
        type: 'STEWARD_REPORT',
        session_id: msg.session_id,
        role: msg.role,
        findings,
        conscience,
        clock_state: state.clock,
        gated_signal,
        timestamp: Date.now(),
    };
}

// ── WebSocket Server ──────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: STEWARD_PORT });

console.log(`[STEWARD] Daemon running on ws://localhost:${STEWARD_PORT}`);
console.log('[STEWARD] Observing. Not leading.');

wss.on('connection', (ws: WebSocket) => {
    console.log('[STEWARD] Chamber connected');

    ws.on('message', (data: Buffer) => {
        try {
            const msg = JSON.parse(data.toString()) as StewardIncoming;

            if (msg.type === 'SESSION_RESET') {
                sessions.delete(msg.session_id);
                sessions.set(msg.session_id, {
                    clock: resetClock(msg.session_id),
                    virtue_counts: {},
                });
                console.log(`[STEWARD] Session reset: ${msg.session_id}`);
                return;
            }

            if (msg.type === 'EXCHANGE') {
                const state = getSession(msg.session_id);
                const report = runPipeline(msg, state);

                // Log significant findings without flooding
                const significant = report.findings.filter(f => f.severity !== 'info');
                if (significant.length > 0) {
                    console.log(`[STEWARD] ${msg.session_id} | ${msg.role} | ${significant.map(f => f.kind).join(', ')}`);
                }

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(report));
                }
            }
        } catch (err) {
            console.error('[STEWARD] Pipeline error:', err);
        }
    });

    ws.on('close', () => {
        console.log('[STEWARD] Chamber disconnected');
    });

    ws.on('error', (err) => {
        console.error('[STEWARD] WebSocket error:', err);
    });
});
