/**
 * Path Safety Utilities for Governed Tool Execution.
 * Ensures that file system operations are restricted to allowlisted paths
 * and prevents directory traversal attacks.
 */

/**
 * Normalizes a path for consistent comparison across platforms.
 * Replaces backslashes with forward slashes and resolves '..' segments.
 */
export function normalizePath(p: string): string {
    // Basic normalization: use forward slashes for cross-platform consistency
    let normalized = p.replace(/\\/g, '/');

    // Resolve '..' and '.' segments (simplified resolution for Phase 1)
    const segments = normalized.split('/');
    const resolved: string[] = [];

    for (const segment of segments) {
        if (segment === '.' || segment === '') continue;
        if (segment === '..') {
            resolved.pop();
        } else {
            resolved.push(segment);
        }
    }

    return resolved.join('/');
}

/**
 * Validates if the given path is allowed by the allowlist.
 * A path is allowed if it starts with one of the allowlisted prefixes
 * after both have been normalized.
 */
export function isPathAllowed(path: string, allowlist: string[]): boolean {
    if (!allowlist || allowlist.length === 0) return false;

    const normalizedPath = normalizePath(path);

    // Safety check: ensure no '..' after normalization attempts to escape
    // Note: normalizePath above already resolves '..', but we verify no leading '..' 
    // or absolute escapes that were missed.
    if (normalizedPath.startsWith('..') || normalizedPath.includes('/../')) {
        return false;
    }

    return allowlist.some(allowedPrefix => {
        const normalizedPrefix = normalizePath(allowedPrefix);
        // Path must start with the prefix and follow with a separator or end
        return normalizedPath === normalizedPrefix ||
            normalizedPath.startsWith(normalizedPrefix + '/');
    });
}
