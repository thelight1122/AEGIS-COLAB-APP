export type PeerType = 'ai' | 'human';
export type PeerRoleClassification = 'biopeer' | 'headmaster' | 'educator' | 'substrate';
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

export interface PeerContextFile {
    name: string;    // display name, e.g. "AEGIS Canon v2"
    content: string; // full text content
}

export interface PeerProfile {
    id: string;
    handle: string; // user-defined handle, e.g. "@atlas"
    name: string;   // human-readable name, for legacy compatibility
    type: PeerType;
    classification?: PeerRoleClassification;
    provider: LLMProvider;
    model: string;
    personaId?: string;
    enabled: boolean;
    domains: string[]; // integration with Governance
    baseURL?: string;
    notes?: string;
    systemPrompt?: string;      // peer-specific instructions prepended to every call
    contextFiles?: PeerContextFile[]; // knowledge files injected into context
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
        classification?: PeerRoleClassification;
        domains?: string[];
        baseURL?: string;
        notes?: string;
        systemPrompt?: string;
        contextFiles?: PeerContextFile[];
        dataQuad?: string[];
        orientation?: TemporalOrientationState;
    }>;
};
