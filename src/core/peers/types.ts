export type PeerType = 'ai' | 'human';
export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'xai' | 'lmstudio' | 'ollama';
export type OrientationStatus = 'unverified' | 'verified' | 'stale' | 'cloud';
export type OrientationSource = 'peer_context' | 'commons_session' | 'manual' | 'system' | 'unknown';
export type OrientationFacet = 'peer' | 'steward' | 'advocate' | 'observer' | 'system';

export interface TemporalOrientationState {
    status: OrientationStatus;
    source: OrientationSource;
    facet: OrientationFacet;
    sessionId?: string;
    orientedAt?: string;
    receipt?: string;
    continuityVersion?: string;
    notes?: string;
}

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
    orientation?: TemporalOrientationState;
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
