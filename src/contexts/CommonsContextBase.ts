import { createContext } from 'react';
import type {
    ConnectedModel,
    WorkshopMessage,
    ExplorationPhase,
    ModelProvider
} from '../types/commons';

export interface CommonsContextType {
    connectedModels: ConnectedModel[];
    messages: WorkshopMessage[];
    isWorkshopActive: boolean;
    audioEnabled: boolean;
    explorationPhase: ExplorationPhase;
    roundRobinOrder: string[];
    currentTurnIndex: number | null;
    sessionId: string | null;

    addModel: (params: {
        provider: ModelProvider,
        model: string,
        apiKey?: string,
        endpointUrl?: string,
        type: 'hosted' | 'local'
    }) => void;
    validateModel: (id: string) => Promise<boolean>;
    enterWorkshop: (explicitSessionId?: string) => void;
    addMessage: (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => void;
    setAudioEnabled: (enabled: boolean) => void;
    startRoundRobin: (userPrompt: string) => void;
    interruptRoundRobin: () => void;
    beginNewChat: () => void;
    setModelSelection: (id: string, isSelected: boolean) => void;
    setModelActivity: (id: string, isActive: boolean) => void;
}

export const CommonsContext = createContext<CommonsContextType | undefined>(undefined);
