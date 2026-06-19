/**
 * Feature flags and environment configuration for the Tools feature slice.
 */

export function isToolsEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_TOOLS === "true";
}

export function isDemoSeedsEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_DEMO_SEEDS === "true";
}

export function getGatewayBaseUrl(): string {
    const baseUrl = import.meta.env.VITE_GATEWAY_BASE_URL;
    if (baseUrl) {
        return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    }
    return ""; // same-origin
}
