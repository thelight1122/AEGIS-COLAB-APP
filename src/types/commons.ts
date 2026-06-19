import type { ATEVerdict, DominantAxis, IntentPosture, SoulQuality, StewardReport } from '../../server/steward-core';
import type { OrientationStatus } from '../core/peers/types';

export type ModelProvider = 'openai' | 'gemini' | 'anthropic' | 'xai' | 'lmstudio' | 'ollama';
export type WorkshopParticipantType = 'initiator' | 'ai' | 'custodian' | 'system';
export type WorkshopPosture = 'Identify' | 'Define' | 'Suggest';
export type WorkshopEventType = 'exchange' | 'reflection' | 'session' | 'rls_reflection';
export type SourceFidelityState = 'verbatim' | 'derived' | 'interpreted' | 'generated' | 'mixed';
export type InquiryDisposition = 'inquiry' | 'contribution' | 'mixed';

export interface ConnectedModel {
    id: string;
    peerId?: string;
    handle?: string;
    facetId?: string;
    dataQuad?: string[];
    systemPrompt?: string;
    contextFiles?: Array<{ name: string; content: string }>;
    provider: ModelProvider;
    model: string;
    apiKey?: string;
    endpointUrl?: string;
    status: 'Not Connected' | 'Connected' | 'Validating';
    type: 'hosted' | 'local';
    isSelected: boolean;
    isActive: boolean;
}

export interface CustodialPulse {
    verdict: ATEVerdict;
    posture: IntentPosture;
    soulQuality: SoulQuality;
    resonanceLevel: number;
    dominantAxis: DominantAxis;
    findingCount: number;
    canonClean: boolean;
}

export interface WorkshopMessage {
    id: string;
    participant: string;
    participantType: WorkshopParticipantType;
    eventType: WorkshopEventType;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    posture: WorkshopPosture;
    report?: StewardReport;
    custodialPulse?: CustodialPulse;
    sourceTurnId?: string;
    orientationStatus?: OrientationStatus;
    orientationReceipt?: string;
    orientationNotes?: string;
    fidelityState?: SourceFidelityState;
    fidelityNotes?: string;
    canonCitationNotes?: string;
    inquiryDisposition?: InquiryDisposition;
    inquiryNotes?: string;
    peerIntrospection?: string;
    peerIntrospectionNotes?: string;
}

export type ExplorationPhase = 'Divergent' | 'Clarifying' | 'Stabilizing' | 'Constructive';

export interface CommonsSessionOverview {
    exchangeCount: number;
    participantCount: number;
    aiTurnCount: number;
    activeAlerts: number;
    averageResonance: number;
    currentPosition: number;
    lastVerdict: ATEVerdict;
    lastSoulQuality: SoulQuality;
    lastPosture: IntentPosture;
}
