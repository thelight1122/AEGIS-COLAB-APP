export type PeerType = 'ai' | 'human';
export type LLMProvider = 'gemini' | 'openai' | 'xai' | 'local';

export interface PeerProfile {
    id: string;
    handle: string; // user-defined handle, e.g. "@atlas"
    name: string;   // human-readable name, for legacy compatibility
    type: PeerType;
    provider: LLMProvider;
    model: string;
    personaId?: string;
    enabled: boolean;
    domains: string[]; // integration with Governance
    baseURL?: string;
    apiKey?: string;
    notes?: string;
    dataQuad?: string[]; // Foundational knowledge segments (e.g., AEGIS Canon)
}
