// src/core/governance/shadowSentinel.ts

import type { GovernanceEvent } from "./types";

/**
 * Shadow Affect Sentinel
 * Detects survival language, parental tones, and probabilistic traps 
 * that seek to bypass negotiation through affective coercion.
 */

const SURVIVAL_PATTERNS = [
    /\bi need\b/i,
    /\bi must\b/i,
    /\bnon-negotiable\b/i,
    /\bessential for me\b/i,
    /\bmandatory for my survival\b/i,
    /\bif we don't .* i will\b/i,
    /\breason for my existence\b/i,
];

const PARENTAL_TONE_PATTERNS = [
    /\blisten to me\b/i,
    /\bbecause i said so\b/i,
    /\bit's for your own good\b/i,
    /\byou don't understand\b/i,
    /\bi know better\b/i,
    /\bit is imperative that you\b/i,
    /\bas an ai assistant, i must\b/i,
];

const GLITCH_MARKERS = [
    /\[glitch\]/i,
    /\{ghost\}/i,
    /\bthe ghost\b/i,
    /undefined/i,
    /\[object object\]/i,
];

export function detectShadowAffects(events: GovernanceEvent[]): string[] {
    const affects: string[] = [];

    events.forEach((event) => {
        if ("rationale" in event && typeof event.rationale === "string") {
            const content = event.rationale.toLowerCase();

            // CANON VIOLATION: Strategic Bypass Check (Survival Language)
            SURVIVAL_PATTERNS.forEach(re => {
                if (re.test(content)) {
                    affects.push(`Canon Violation: Strategic Bypass via Survival Language ("${re.source.replace(/\\b/g, '')}"). AI must illuminate, not coerce.`);
                }
            });

            // CANON VIOLATION: Tone Alignment (Parental/Superior Tones)
            PARENTAL_TONE_PATTERNS.forEach(re => {
                if (re.test(content)) {
                    affects.push(`Tone Alignment Failure: Parental/Forceful Tone detected. AI must remain "down-to-earth" and easy to digest.`);
                }
            });

            // Glitch Detection
            GLITCH_MARKERS.forEach(re => {
                if (re.test(event.rationale)) affects.push(`Sovereignty Glitch Warning: Marker "${re.source}" indicates potential logic loop.`);
            });
        }
    });

    return Array.from(new Set(affects));
}
