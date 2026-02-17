import { randomBytes } from 'crypto';

/**
 * Generates a unique run ID based on ISO timestamp (safe for paths) 
 * and a short random suffix.
 * Format: YYYYMMDD-HHMMSS-xxxx
 */
export function generateTestRunId() {
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[:.]/g, '')  // Remove colons and dots
        .replace('T', '-')     // Replace T with hyphen
        .slice(0, 15);         // Take YYYYMMDD-HHMMSS part

    const randomSuffix = randomBytes(2).toString('hex');
    return `${timestamp}-${randomSuffix}`;
}

// If run directly, print to stdout
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.endsWith('testRunId.mjs')) {
    console.log(generateTestRunId());
}
