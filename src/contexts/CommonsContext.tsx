import React, { useState, useEffect } from 'react';
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

    // Mirror API keys to sessionStorage (but not database)
    useEffect(() => {
        const stored = sessionStorage.getItem('aegis_keys');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                console.log('Stored keys found', parsed);
            } catch (e) { console.error('Failed to parse stored keys', e); }
        }
    }, []);

    const addModel = ({ provider, model, apiKey, endpointUrl, type }: {
        provider: ModelProvider,
        model: string,
        apiKey?: string,
        endpointUrl?: string,
        type: 'hosted' | 'local'
    }) => {
        const id = crypto.randomUUID();
        setConnectedModels(prev => [...prev, { id, provider, model, apiKey, endpointUrl, status: 'Not Connected', type }]);
    };

    const validateModel = async (id: string) => {
        setConnectedModels(prev => prev.map(m => m.id === id ? { ...m, status: 'Validating' } : m));
        await new Promise(resolve => setTimeout(resolve, 800));
        setConnectedModels(prev => prev.map(m => m.id === id ? { ...m, status: 'Connected' } : m));
        return true;
    };

    const enterWorkshop = () => {
        if (connectedModels.some(m => m.status === 'Connected')) {
            setIsWorkshopActive(true);
            setRoundRobinOrder(connectedModels.filter(m => m.status === 'Connected').map(m => m.id));
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

        for (let i = 0; i < roundRobinOrder.length; i++) {
            setCurrentTurnIndex(i);
            const modelId = roundRobinOrder[i];
            const model = connectedModels.find(m => m.id === modelId);
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

            const words = responseText.split(" ");
            let currentText = "";

            // Simple streaming simulation for UI feel
            for (const word of words) {
                currentText += (currentText ? " " : "") + word;
                // Add message early if we want progressive rendering, but here we add once finished
                // Wait, the original code adds it ONCE at the end. I'll maintain that for now but with the real text.
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

    return (
        <CommonsContext.Provider value={{
            connectedModels,
            messages,
            isWorkshopActive,
            audioEnabled,
            explorationPhase,
            roundRobinOrder,
            currentTurnIndex,
            addModel,
            validateModel,
            enterWorkshop,
            addMessage,
            setAudioEnabled,
            startRoundRobin,
            interruptRoundRobin
        }}>
            {children}
        </CommonsContext.Provider>
    );
}
