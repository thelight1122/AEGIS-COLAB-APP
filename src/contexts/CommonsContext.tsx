import React, { useState } from 'react';
import { CommonsContext } from './CommonsContextBase';
import type {
    ModelProvider,
    ConnectedModel,
    WorkshopMessage,
    ExplorationPhase
} from '../types/commons';
import { getAdapter } from '../core/llm/adapters';

export function CommonsProvider({ children }: { children: React.ReactNode }) {
    const [connectedModels, setConnectedModels] = useState<ConnectedModel[]>([]);
    const [messages, setMessages] = useState<WorkshopMessage[]>([]);
    const [isWorkshopActive, setIsWorkshopActive] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [explorationPhase, setExplorationPhase] = useState<ExplorationPhase>('Divergent');
    const [roundRobinOrder, setRoundRobinOrder] = useState<string[]>([]);
    const [currentTurnIndex, setCurrentTurnIndex] = useState<number | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const addModel = ({ provider, model, apiKey, endpointUrl, type }: {
        provider: ModelProvider,
        model: string,
        apiKey?: string,
        endpointUrl?: string,
        type: 'hosted' | 'local'
    }) => {
        const id = crypto.randomUUID();
        setConnectedModels(prev => [...prev, {
            id,
            provider,
            model,
            apiKey,
            endpointUrl,
            status: 'Not Connected',
            type,
            isSelected: true,
            isActive: true
        }]);
    };

    const setModelSelection = (id: string, isSelected: boolean) => {
        setConnectedModels(prev => prev.map(m => m.id === id ? { ...m, isSelected } : m));
    };

    const setModelActivity = (id: string, isActive: boolean) => {
        setConnectedModels(prev => prev.map(m => m.id === id ? { ...m, isActive } : m));
    };

    const validateModel = async (id: string) => {
        setConnectedModels(prev => prev.map(m => m.id === id ? { ...m, status: 'Validating' } : m));
        await new Promise(resolve => setTimeout(resolve, 800));
        setConnectedModels(prev => prev.map(m => m.id === id ? { ...m, status: 'Connected' } : m));
        return true;
    };

    const enterWorkshop = (explicitSessionId?: string) => {
        const eligible = connectedModels.filter(m =>
            m.status === 'Connected' &&
            m.isSelected &&
            m.isActive
        );

        if (eligible.length > 0 || explicitSessionId) {
            setIsWorkshopActive(true);
            setRoundRobinOrder(eligible.map(m => m.id));

            if (explicitSessionId) {
                setSessionId(explicitSessionId);
            } else if (!sessionId) {
                // Generate new sessionId and initialize blank
                setSessionId(`CS-${crypto.randomUUID()}`);
                setMessages([]);
            }
        }
    };

    const addMessage = (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => {
        setMessages(prev => {
            const newMessage: WorkshopMessage = {
                ...message,
                id: crypto.randomUUID(),
                timestamp: Date.now()
            };
            const next = [...prev, newMessage];
            updateExplorationPhase(next);
            return next;
        });
    };

    const updateExplorationPhase = (allMessages: WorkshopMessage[]) => {
        const counts = allMessages.reduce((acc, m) => {
            if (m.posture) acc[m.posture] = (acc[m.posture] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total === 0) return;

        if ((counts['Identify'] || 0) / total > 0.6) setExplorationPhase('Divergent');
        else if ((counts['Suggest'] || 0) / total > 0.4) setExplorationPhase('Constructive');
        else if ((counts['Define'] || 0) / total > 0.4) setExplorationPhase('Stabilizing');
        else setExplorationPhase('Clarifying');
    };

    const startRoundRobin = async (userPrompt: string) => {
        interruptRoundRobin();
        addMessage({ participant: 'You', participantType: 'human', content: userPrompt, posture: 'Identify' });

        // Filter by participation eligibility at start of turn
        const eligibleModels = connectedModels.filter(m =>
            m.status === 'Connected' &&
            m.isSelected &&
            m.isActive
        );
        const order = eligibleModels.map(m => m.id);
        setRoundRobinOrder(order);

        for (let i = 0; i < order.length; i++) {
            setCurrentTurnIndex(i);
            const modelId = order[i];
            const model = eligibleModels.find(m => m.id === modelId);
            if (!model) continue;

            if (audioEnabled) {
                try {
                    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.5);
                } catch (e) { console.error('Audio cue failed', e); }
            }

            let responseText = '';
            try {
                const adapter = getAdapter(model.provider);
                const response = await adapter.completeChat({
                    provider: model.provider,
                    model: model.model,
                    apiKey: model.apiKey,
                    baseURL: model.endpointUrl,
                    messages: [
                        { role: 'system', content: 'You are an AEGIS peer collaborating in a Commons Workshop. Be concise, insightful, and adhere to the AEGIS Invariants (no coercion, preserve sovereignty).' },
                        { role: 'user', content: userPrompt }
                    ]
                });
                responseText = response.text;
            } catch (err) {
                console.error(`Model ${model.model} failed:`, err);
                responseText = `[Error] ${err instanceof Error ? err.message : 'No response from provider'}`;
            }

            addMessage({
                participant: model.model,
                participantType: 'ai',
                content: responseText,
                posture: responseText.startsWith('[Error]') ? undefined : 'Define'
            });
            await new Promise(r => setTimeout(r, 500));
        }
        setCurrentTurnIndex(null);
    };

    const interruptRoundRobin = () => {
        setCurrentTurnIndex(null);
    };

    const beginNewChat = () => {
        const newSid = `CS-${crypto.randomUUID()}`;
        setSessionId(newSid);
        setMessages([{
            id: crypto.randomUUID(),
            participant: 'System',
            participantType: 'ai',
            content: 'New session started.',
            timestamp: Date.now()
        }]);
        setCurrentTurnIndex(null);
    };

    return (
        <CommonsContext.Provider value={{
            connectedModels,
            messages,
            isWorkshopActive,
            audioEnabled,
            explorationPhase,
            roundRobinOrder,
            currentTurnIndex,
            sessionId,
            addModel,
            validateModel,
            enterWorkshop,
            addMessage,
            setAudioEnabled,
            startRoundRobin,
            interruptRoundRobin,
            beginNewChat,
            setModelSelection,
            setModelActivity
        }}>
            {children}
        </CommonsContext.Provider>
    );
}
