import { getGatewayBaseUrl } from '../env';
import type { HealthResponse } from './types';

/**
 * Pings the gateway health endpoint.
 */
export async function pingHealth(): Promise<HealthResponse> {
    const baseUrl = getGatewayBaseUrl();
    const url = `${baseUrl}/api/health`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            ok: true,
            providers: data.providers,
            ts: data.ts
        };
    } catch (error) {
        console.error('Gateway health check failed:', error);
        return { ok: false };
    }
}
