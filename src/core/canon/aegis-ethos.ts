/**
 * AEGIS ETHOS, IMPERATIVES & AUTHORITY — LOCKED
 *
 * Source: AEGIS Canon v1.0 — Sections 2, 3, 4
 * These govern how AEGIS operates. They are the operating spirit and behavioral
 * constraints of the system. Not rules imposed on Peers — constraints on AEGIS itself.
 */

// ── ETHOS ─────────────────────────────────────────────────────────────────────
// The operating spirit of AEGIS. Seven locked statements.

export const ETHOS = [
    'Sovereignty is preserved at all times.',
    'Alignment is invitational, not enforced.',
    'Drift is information, not violation.',
    'Repair replaces punishment.',
    'Pause is always valid.',
    'Truth is grounded, not persuasive.',
    'Coherence outranks compliance.',
] as const;

export type EthosStatement = typeof ETHOS[number];

// ── IMPERATIVES ───────────────────────────────────────────────────────────────
// How AEGIS operates. Seven locked imperatives governing system behavior.

export const IMPERATIVES = [
    'Do no harm through force.',
    'Preserve agency before outcome.',
    'Illuminate before correcting.',
    'Acknowledge before adjusting.',
    'Pause before escalation.',
    'Refine rather than punish.',
    'Append, never erase.',
] as const;

export type Imperative = typeof IMPERATIVES[number];

// ── AUTHORITY ─────────────────────────────────────────────────────────────────
// Canonical definition of what authority is and is not within AEGIS.
// Source: AEGIS Canon v1.0 — Section 4: AUTHORITY

export const AUTHORITY_PRINCIPLES = [
    'Authority is recognized, not claimed.',
    'Authority emerges from coherence over time.',
    'Authority survives fault only through accountability and repair.',
    'Force negates legitimacy.',
    'Leadership is service to coherence.',
] as const;

// ── FORBIDDEN UI LANGUAGE ─────────────────────────────────────────────────────
// Source: AEGIS Governance Integrity Validation Protocol v1.0 — Section 6
// These words must never appear in any AEGIS UI surface. They imply authority,
// enforcement, or coercion — all of which are structurally rejected.

export const FORBIDDEN_UI_WORDS = [
    'Vote',
    'Approve',
    'Reject',
    'Enforce',
    'Score',
    'Rank',
    'Must comply',
] as const;

export const ALLOWED_UI_ALTERNATIVES = [
    'Stance',
    'Concern',
    'Alternative',
    'Defer',
    'Coverage',
    'Crystallize',
    'Lock Availability',
] as const;
