export type PeerType = 'ai' | 'human';
export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'xai' | 'lmstudio' | 'ollama';

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
    notes?: string;
    dataQuad?: string[]; // Foundational knowledge segments (e.g., AEGIS Canon)
}

export type TeamPreset = {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    peers: Array<{
        peerId: string;        // local id
        handle: string;        // @lumin, etc
        kind: "human" | "ai";
        provider?: LLMProvider;
        model?: string;
        personaTemplateId?: string;
        enabled: boolean;
    }>;
};
