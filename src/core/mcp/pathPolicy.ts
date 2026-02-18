/**
 * Path Safety Utilities for Governed Tool Execution.
 * Ensures that file system operations are restricted to allowlisted paths
 * and prevents directory traversal attacks.
 */

/**
 * Normalizes a path for consistent comparison.
 * In a Node environment, this should ideally be path.resolve().
 * For cross-platform/browser compatibility, we ensure absolute resolution.
 */
export function canonicalizePath(p: string, base: string = '/'): string {
    // Basic normalization: use forward slashes
    let normalized = p.replace(/\\/g, '/');

    // If path is not absolute, join with base
    if (!normalized.startsWith('/')) {
        normalized = base.replace(/\\/g, '/') + (base.endsWith('/') ? '' : '/') + normalized;
    }

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

    return '/' + resolved.join('/');
}

/**
 * Validates if the given path is allowed by the allowlist using Canonical Comparison.
 */
export function isPathAllowed(path: string, allowlist: string[]): boolean {
    if (!allowlist || allowlist.length === 0) return false;

    // We use a virtual root '/' for canonicalization in this logic
    const canonicalPath = canonicalizePath(path);

    // Safety check: no directory traversal escape
    if (canonicalPath === '/' && path.includes('..')) {
        return false;
    }

    return allowlist.some(allowedPrefix => {
        const canonicalPrefix = canonicalizePath(allowedPrefix);

        // Canonical Prefix must match the start of Canonical Path
        return canonicalPath === canonicalPrefix ||
            canonicalPath.startsWith(canonicalPrefix + '/');
    });
}
