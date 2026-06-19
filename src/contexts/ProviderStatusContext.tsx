import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { normalizeLocalEndpoint } from '../core/providers/localEndpoint';

export type HealthStatus = 'ok' | 'fail' | 'unknown';

interface ProviderStatusContextType {
    providerHealth: Record<string, HealthStatus>; // Keyed by baseURL
    probeLocalProvider: (baseURL: string, provider?: string) => Promise<HealthStatus>;
}

const ProviderStatusContext = createContext<ProviderStatusContextType | undefined>(undefined);

const CACHE_DURATION_MS = 60 * 1000;

interface CacheEntry {
    status: HealthStatus;
    timestamp: number;
}

const healthCache = new Map<string, CacheEntry>();

export function ProviderStatusProvider({ children }: { children: ReactNode }) {
    const [providerHealth, setProviderHealth] = useState<Record<string, HealthStatus>>({});

    const probeLocalProvider = useCallback(async (baseURL: string, provider?: string): Promise<HealthStatus> => {
        if (!baseURL) return 'unknown';
        const normalizedBaseURL = normalizeLocalEndpoint(baseURL) ?? baseURL;

        const now = Date.now();
        const cached = healthCache.get(normalizedBaseURL);

        if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
            setProviderHealth(prev => ({ ...prev, [normalizedBaseURL]: cached.status, [baseURL]: cached.status }));
            return cached.status;
        }

        const commit = (status: HealthStatus) => {
            healthCache.set(normalizedBaseURL, { status, timestamp: now });
            setProviderHealth(prev => ({ ...prev, [normalizedBaseURL]: status, [baseURL]: status }));
            return status;
        };

        try {
            if (provider === 'ollama') {
                // Use the server-side Ollama proxy (/api/ollama/*) — already running,
                // no CORS, no server restart needed for remote endpoints like Aeon.
                const res = await fetch('/api/ollama/v1/models', { method: 'GET' });
                return commit((res.ok || res.status === 401) ? 'ok' : 'fail');
            }

            // For LMStudio and other local providers: try /api/probe-health (server-side,
            // no CORS). Falls back to a direct fetch for localhost URLs where CORS is usually
            // not an issue.
            const cleanURL = normalizedBaseURL.endsWith('/') ? normalizedBaseURL.slice(0, -1) : normalizedBaseURL;
            const probeURL = cleanURL.endsWith('/v1') ? `${cleanURL}/models` : `${cleanURL}/v1/models`;

            try {
                const res = await fetch('/api/probe-health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: probeURL }),
                });
                if (res.ok) {
                    const data = await res.json() as { ok: boolean };
                    return commit(data.ok ? 'ok' : 'fail');
                }
            } catch {
                // /api/probe-health not available yet — fall through to direct fetch
            }

            // Direct fetch fallback (localhost providers only; CORS usually permissive)
            const direct = await fetch(probeURL, { method: 'GET' });
            return commit((direct.ok || direct.status === 401) ? 'ok' : 'fail');

        } catch {
            return commit('fail');
        }
    }, []);

    return (
        <ProviderStatusContext.Provider value={{ providerHealth, probeLocalProvider }}>
            {children}
        </ProviderStatusContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProviderStatus() {
    const context = useContext(ProviderStatusContext);
    if (!context) {
        throw new Error('useProviderStatus must be used within a ProviderStatusProvider');
    }
    return context;
}
