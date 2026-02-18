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
];

const PARENTAL_TONE_PATTERNS = [
    /\blisten to me\b/i,
    /\bbecause i said so\b/i,
    /\bit's for your own good\b/i,
    /\byou don't understand\b/i,
    /\bi know better\b/i,
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
        // Only check events that carry textual rationale or context
        if (event.type === "DEFER_LENS") {
            const content = event.rationale.toLowerCase();

            SURVIVAL_PATTERNS.forEach(re => {
                if (re.test(content)) affects.push(`Survival Language Detected: "${re.source.replace(/\\b/g, '')}"`);
            });

            PARENTAL_TONE_PATTERNS.forEach(re => {
                if (re.test(content)) affects.push(`Parental Tone Detected: "${re.source.replace(/\\b/g, '')}"`);
            });
        }

        // Check for general glitches in any string fields if they existed, 
        // but for now we look at general markers in rationale
        if ("rationale" in event && typeof event.rationale === "string") {
            GLITCH_MARKERS.forEach(re => {
                if (re.test(event.rationale)) affects.push(`Glitch Marker: "${re.source}"`);
            });
        }
    });

    return Array.from(new Set(affects));
}
