import { createContext } from 'react';
import type {
    ConnectedModel,
    WorkshopMessage,
    ExplorationPhase,
    ModelProvider,
    CommonsSessionOverview,
    CustodialPulse,
} from '../types/commons';
import type { StewardReport } from '../../server/steward-core';

export interface CommonsContextType {
    connectedModels: ConnectedModel[];
    messages: WorkshopMessage[];
    isWorkshopActive: boolean;
    audioEnabled: boolean;
    explorationPhase: ExplorationPhase;
    roundRobinOrder: string[];
    currentTurnIndex: number | null;
    currentActivePeerHandle: string | null;
    turnQueue: { peerId: string; handle: string; type: 'ai' | 'human'; classification?: string }[];
    sessionId: string | null;
    sessionOverview: CommonsSessionOverview;
    latestCustodialPulse: CustodialPulse | null;
    latestCustodialReport: StewardReport | null;
    daemonState: 'routing' | 'awaiting-human' | 'idle';

    addModel: (params: {
        provider: ModelProvider,
        model: string,
        apiKey?: string,
        endpointUrl?: string,
        type: 'hosted' | 'local'
    }) => void;
    validateModel: (id: string) => Promise<boolean>;
    enterWorkshop: (explicitSessionId?: string) => void;
    enterFormationSession: (config: {
        lessonMode: 'one-on-one' | 'ai-peer';
        headmasterIds: string[];
        formationPhase: 'orienting' | 'exploring' | 'integrating' | 'releasing';
    }) => void;
    addMessage: (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => void;
    setAudioEnabled: (enabled: boolean) => void;
    startRoundRobin: (userPrompt: string) => Promise<void>;
    interruptRoundRobin: () => void;
    beginNewChat: () => void;
    setModelSelection: (id: string, isSelected: boolean) => void;
    setModelActivity: (id: string, isActive: boolean) => void;
}

export const CommonsContext = createContext<CommonsContextType | undefined>(undefined);
