export type ModelProvider = 'openai' | 'gemini' | 'anthropic';

export interface ConnectedModel {
    id: string;
    provider: ModelProvider;
    model: string;
    apiKey: string;
    status: 'Not Connected' | 'Connected' | 'Validating';
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
