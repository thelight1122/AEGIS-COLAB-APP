import type { ModelProvider } from '../../types/commons';

export type RuntimeInterfaceProfile = {
    provider: ModelProvider;
    model: string;
    endpoint?: string;
};

export const RUNTIME_PROFILE_STORAGE_KEY = 'aegis_runtime_interface_profiles_v1';

export const DEFAULT_RUNTIME_PROFILES: Record<ModelProvider, RuntimeInterfaceProfile> = {
    openai: { provider: 'openai', model: 'gpt-4o' },
    gemini: { provider: 'gemini', model: 'gemini-1.5-pro' },
    anthropic: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
    xai: { provider: 'xai', model: 'grok-2-latest' },
    lmstudio: { provider: 'lmstudio', model: '', endpoint: 'http://localhost:1234/v1' },
    ollama: { provider: 'ollama', model: '', endpoint: 'http://localhost:11434' },
};

export function loadRuntimeInterfaceProfiles(): Record<ModelProvider, RuntimeInterfaceProfile> {
    const defaults = { ...DEFAULT_RUNTIME_PROFILES };

    if (typeof window === 'undefined') {
        return defaults;
    }

    try {
        const raw = localStorage.getItem(RUNTIME_PROFILE_STORAGE_KEY);
        if (!raw) return defaults;

        const parsed = JSON.parse(raw) as Partial<Record<ModelProvider, Partial<RuntimeInterfaceProfile>>>;

        // Migrate stale anthropic model name
        if (parsed.anthropic?.model === 'claude-3-5-sonnet') {
            parsed.anthropic.model = 'claude-sonnet-4-5';
        }

        return (Object.keys(defaults) as ModelProvider[]).reduce((profiles, provider) => {
            profiles[provider] = {
                ...defaults[provider],
                ...(parsed[provider] ?? {}),
                provider,
            };
            return profiles;
        }, {} as Record<ModelProvider, RuntimeInterfaceProfile>);
    } catch {
        return defaults;
    }
}

export function saveRuntimeInterfaceProfiles(profiles: Record<ModelProvider, RuntimeInterfaceProfile>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(RUNTIME_PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

