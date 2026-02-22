export type ModelProvider = 'openai' | 'gemini' | 'anthropic' | 'grok' | 'lmstudio' | 'ollama';

export interface ConnectedModel {
    id: string;
    provider: ModelProvider;
    model: string;
    apiKey?: string;
    endpointUrl?: string;
    status: 'Not Connected' | 'Connected' | 'Validating';
    type: 'hosted' | 'local';
    isSelected: boolean;
    isActive: boolean;
}

export interface WorkshopMessage {
    id: string;
    participant: string;
    participantType: 'human' | 'ai';
    content: string;
    timestamp: number;
    posture?: 'Identify' | 'Define' | 'Suggest';
}

export type ExplorationPhase = 'Divergent' | 'Clarifying' | 'Stabilizing' | 'Constructive';
