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

    addModel: (provider: ModelProvider, model: string, apiKey: string) => void;
    validateModel: (id: string) => Promise<boolean>;
    enterWorkshop: () => void;
    addMessage: (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => void;
    setAudioEnabled: (enabled: boolean) => void;
    startRoundRobin: (userPrompt: string) => void;
    interruptRoundRobin: () => void;
}

export const CommonsContext = createContext<CommonsContextType | undefined>(undefined);
