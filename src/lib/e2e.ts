/**
 * E2E Mode Detection Utility
 * 
 * Provides centralized detection for E2E mode.
 * Active when ?e2e=1 is in the URL or VITE_E2E=1 is set during build.
 */

export const isE2E = (): boolean => {
    // Check URL parameter
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('e2e') === '1') return true;
    }

    // Check environment variable (Vite)
    return !!import.meta.env.VITE_E2E;
};
