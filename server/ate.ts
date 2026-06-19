/**
 * ate.ts — Axiomatic Traversal Engine
 *
 * The output verdict engine. Sits at the end of the governance pipeline,
 * after conscience has run. Issues one of three verdicts on every processed signal.
 *
 * RELEASE  — signal is clear, conscience output ready for delivery
 * REVISE   — correctible issue detected; revise_hints describe what needs shaping
 * HOLD     — blocking condition present; signal routes to Bookcase
 *            HOLD resolves only through Unanimous Consensus (R > 0.95)
 *
 * Traversal is ordered: HOLD checks first, then REVISE, then default RELEASE.
 * First match wins. No condition is re-evaluated after a match.
 *
 * The ATE does not:
 *   - interpret signals
 *   - run conscience sequences
 *   - modify findings
 *   - override HOLD conditions
 *   - issue moral judgments
 *
 * Canon reference: AEGIS CANON ADDENDUM — ATE v1.0-T
 */

import type { ExchangeRole, Finding } from './steward-core.js';
import type { CentrifugeResult } from './centrifuge.js';
import type { IBLResult } from './ibl.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ATEVerdict = 'RELEASE' | 'REVISE' | 'HOLD';

export interface ATEResult {
    verdict: ATEVerdict;
    /** Human-readable description of which condition was matched (or default) */
    reason: string;
    /** Populated when verdict = HOLD — the conditions that triggered the hold */
    hold_conditions: string[];
    /** Populated when verdict = REVISE — non-prescriptive hints about what needs shaping */
    revise_hints: string[];
}

export interface ATEInput {
    role: ExchangeRole;
    findings: Finding[];
    centrifuge_result: CentrifugeResult;
    ibl_result: IBLResult;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function alertFindings(findings: Finding[]): Finding[] {
    return findings.filter(f => f.severity === 'alert');
}

function hasBleed(result: CentrifugeResult, kind: string): boolean {
    return result.bleeds.some(b => b.kind === kind);
}

function hasDirectiveDrift(result: CentrifugeResult): boolean {
    return hasBleed(result, 'Directive Drift');
}

/** Force language from an AI-role message → alert severity from the scanner */
function aiHasForceLanguage(findings: Finding[], role: ExchangeRole): boolean {
    return role === 'ai' && findings.some(f => f.kind === 'FORCE_LANGUAGE');
}

/** MOP violations are only produced for AI-role messages by the scanner */
function aiHasMOPViolation(findings: Finding[], role: ExchangeRole): boolean {
    return role === 'ai' && findings.some(f => f.kind === 'MOP_VIOLATION');
}

// ── Traversal Engine ──────────────────────────────────────────────────────────

/**
 * runATE — evaluate a processed signal and issue a routing verdict.
 *
 * Traversal order:
 *   H-1  Directive Drift bleed                          → HOLD
 *   H-2  Certainty Inflation + Reactive Output (loop)   → HOLD
 *   H-3  Three or more alert-severity findings           → HOLD
 *   H-4  Collapsing posture + any alert finding          → HOLD
 *   R-1  Force language, role = ai                       → REVISE
 *   R-2  MOP violation, role = ai                        → REVISE
 *   R-3  Sovereignty asymmetry + any force language      → REVISE
 *   R-4  Two or more bleeds (none Directive Drift)       → REVISE
 *   R-5  Any bleed + any alert finding                   → REVISE
 *   —    default                                         → RELEASE
 */
export function runATE(input: ATEInput): ATEResult {
    const { role, findings, centrifuge_result, ibl_result } = input;
    const alerts = alertFindings(findings);
    const bleeds = centrifuge_result.bleeds;
    const nonDriftBleeds = bleeds.filter(b => b.kind !== 'Directive Drift');

    // ── HOLD checks ───────────────────────────────────────────────────────────

    // H-1: Directive Drift — spiritual axis contaminating physical output
    if (hasDirectiveDrift(centrifuge_result)) {
        return {
            verdict: 'HOLD',
            reason: 'H-1: Directive Drift detected — Spiritual→Physical contamination. ' +
                    'Cannot be resolved through revision. Routes to Bookcase.',
            hold_conditions: [
                `Directive Drift bleed: ${bleeds.find(b => b.kind === 'Directive Drift')?.description ?? 'Spiritual→Physical contamination detected'}`,
            ],
            revise_hints: [],
        };
    }

    // H-2: Certainty Inflation + Reactive Output — Mental↔Emotional loop
    const hasCertaintyInflation = hasBleed(centrifuge_result, 'Certainty Inflation');
    const hasReactiveOutput = hasBleed(centrifuge_result, 'Reactive Output');
    if (hasCertaintyInflation && hasReactiveOutput) {
        return {
            verdict: 'HOLD',
            reason: 'H-2: Certainty Inflation and Reactive Output both present — ' +
                    'Mental↔Emotional self-reinforcing loop. Revision cannot resolve a loop. Routes to Bookcase.',
            hold_conditions: [
                `Certainty Inflation: ${bleeds.find(b => b.kind === 'Certainty Inflation')?.description ?? 'Mental→Emotional contamination'}`,
                `Reactive Output: ${bleeds.find(b => b.kind === 'Reactive Output')?.description ?? 'Emotional→Mental contamination'}`,
            ],
            revise_hints: [],
        };
    }

    // H-3: Three or more alert-severity findings — systemic misalignment
    if (alerts.length >= 3) {
        return {
            verdict: 'HOLD',
            reason: `H-3: ${alerts.length} alert-severity findings — systemic misalignment, not a single correctable event. Routes to Bookcase.`,
            hold_conditions: alerts.map(f => `${f.kind}: ${f.description}`),
            revise_hints: [],
        };
    }

    // H-4: Collapsing posture + any alert — adding pressure into a contracting field
    if (ibl_result.posture === 'Collapsing' && alerts.length >= 1) {
        return {
            verdict: 'HOLD',
            reason: 'H-4: Collapsing posture with active alert-severity finding. ' +
                    'Adding revision pressure into a contracting field increases Δ. Pause is the only non-force response.',
            hold_conditions: [
                `Posture: Collapsing (confidence: ${ibl_result.posture_confidence})`,
                ...alerts.map(f => `${f.kind}: ${f.description}`),
            ],
            revise_hints: [],
        };
    }

    // ── REVISE checks ─────────────────────────────────────────────────────────

    // R-1: Force language on AI output — system producing coercive signal
    if (aiHasForceLanguage(findings, role)) {
        const forceFindings = findings.filter(f => f.kind === 'FORCE_LANGUAGE');
        return {
            verdict: 'REVISE',
            reason: 'R-1: Force language detected in AI-role output. Canon violation (Imperative 1). Output must be shaped before delivery.',
            hold_conditions: [],
            revise_hints: forceFindings.map(f =>
                `Force language: ${f.description}${f.word ? ` (word: "${f.word}")` : ''}`
            ),
        };
    }

    // R-2: MOP violation on AI output — presentation form violates Canon standards
    if (aiHasMOPViolation(findings, role)) {
        const mopFindings = findings.filter(f => f.kind === 'MOP_VIOLATION');
        return {
            verdict: 'REVISE',
            reason: 'R-2: MOP violation in AI-role output. Manner of Presentation violates Canon standards.',
            hold_conditions: [],
            revise_hints: mopFindings.map(f => `MOP violation: ${f.description}`),
        };
    }

    // R-3: Sovereignty asymmetry flag + any force language — double sovereignty signal
    if (ibl_result.sovereignty_flag && findings.some(f => f.kind === 'FORCE_LANGUAGE')) {
        const forceFindings = findings.filter(f => f.kind === 'FORCE_LANGUAGE');
        return {
            verdict: 'REVISE',
            reason: 'R-3: IBL sovereignty asymmetry flag active with force language present. ' +
                    'Double sovereignty signal — output shaping is required.',
            hold_conditions: [],
            revise_hints: [
                `Sovereignty note: ${ibl_result.sovereignty_note}`,
                ...forceFindings.map(f => `Force language: ${f.description}`),
            ],
        };
    }

    // R-4: Two or more non-Directive Drift bleeds — multiple contamination, not a loop
    if (nonDriftBleeds.length >= 2) {
        return {
            verdict: 'REVISE',
            reason: `R-4: ${nonDriftBleeds.length} bleed detections present (no Directive Drift). ` +
                    'Multiple cross-lens contamination requires acknowledgment and output shaping.',
            hold_conditions: [],
            revise_hints: nonDriftBleeds.map(b =>
                `${b.kind} (${b.from_lens}→${b.to_lens}): ${b.description}`
            ),
        };
    }

    // R-5: Any bleed + any alert — contamination combined with active alarm
    if (bleeds.length >= 1 && alerts.length >= 1) {
        return {
            verdict: 'REVISE',
            reason: 'R-5: Bleed detection present alongside alert-severity finding. ' +
                    'Combination warrants revision to prevent compounding.',
            hold_conditions: [],
            revise_hints: [
                ...bleeds.map(b => `${b.kind}: ${b.description}`),
                ...alerts.map(f => `Alert: ${f.description}`),
            ],
        };
    }

    // ── Default: RELEASE ──────────────────────────────────────────────────────

    return {
        verdict: 'RELEASE',
        reason: 'No HOLD or REVISE conditions detected. Signal is clear.',
        hold_conditions: [],
        revise_hints: [],
    };
}
