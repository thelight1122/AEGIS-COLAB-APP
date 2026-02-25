import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type HealthStatus = 'ok' | 'fail' | 'unknown';

interface ProviderStatusContextType {
    providerHealth: Record<string, HealthStatus>; // Keyed by baseURL
    probeLocalProvider: (baseURL: string) => Promise<HealthStatus>;
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

    const probeLocalProvider = useCallback(async (baseURL: string): Promise<HealthStatus> => {
        if (!baseURL) return 'unknown';

        const now = Date.now();
        const cached = healthCache.get(baseURL);

        if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
            setProviderHealth(prev => ({ ...prev, [baseURL]: cached.status }));
            return cached.status;
        }

        try {
            // Trim trailing slash for consistent URL formation
            const cleanURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;

            // Assuming LM Studio / Ollama generally respond to /v1/models for basic connectivity check.
            const url = cleanURL.endsWith('/v1') ? `${cleanURL}/models` : `${cleanURL}/v1/models`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const res = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const status: HealthStatus = res.ok ? 'ok' : 'fail';
            healthCache.set(baseURL, { status, timestamp: now });
            setProviderHealth(prev => ({ ...prev, [baseURL]: status }));
            return status;

        } catch {
            healthCache.set(baseURL, { status: 'fail', timestamp: now });
            setProviderHealth(prev => ({ ...prev, [baseURL]: 'fail' }));
            return 'fail';
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
