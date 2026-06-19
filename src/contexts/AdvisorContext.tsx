import { createContext, useContext, useState, type ReactNode } from 'react';
import { useKeyring } from './KeyringContext';
import { callGateway } from '../core/llm/gatewayClient';
import { loadRuntimeInterfaceProfiles } from '../core/providers/runtimeInterfaceProfiles';

export interface AdvisorMessage {
    id: string;
    sender: 'user' | 'advisor';
    text: string;
    timestamp: Date;
    attachments?: { name: string; type: string; url: string }[];
}

export interface WhiteboardAction {
    type: 'create';
    nodeType: 'proposal' | 'tension' | 'scenario' | 'boundary' | 'image' | 'agent' | 'decision';
    data: any;
}

interface AdvisorContextType {
    messages: AdvisorMessage[];
    whiteboardQueue: WhiteboardAction[];
    isResponding: boolean;
    advisorError: string | null;
    addMessage: (text: string, sender: 'user' | 'advisor', attachments?: AdvisorMessage['attachments']) => Promise<void>;
    enqueueNodeAction: (action: WhiteboardAction) => void;
    consumeQueue: () => WhiteboardAction[];
}

const AdvisorContext = createContext<AdvisorContextType | undefined>(undefined);

export function AdvisorProvider({ children }: { children: ReactNode }) {
    const { keys, status } = useKeyring();
    const [messages, setMessages] = useState<AdvisorMessage[]>([
        { id: '1', sender: 'advisor', text: 'Greetings Peer. I am your AI Advisor. Unlock the Gemini key in Settings, then ask me to help with this workspace.', timestamp: new Date() }
    ]);
    const [whiteboardQueue, setWhiteboardQueue] = useState<WhiteboardAction[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [advisorError, setAdvisorError] = useState<string | null>(null);

    const enqueueNodeAction = (action: WhiteboardAction) => {
        setWhiteboardQueue((prev) => [...prev, action]);
    };

    const addMessage = async (text: string, sender: 'user' | 'advisor', attachments?: AdvisorMessage['attachments']) => {
        const newMessage: AdvisorMessage = {
            id: `msg-${Date.now()}`,
            sender,
            text,
            timestamp: new Date(),
            attachments
        };
        setMessages((prev) => [...prev, newMessage]);

        if (sender !== 'user') {
            return;
        }

        setAdvisorError(null);

        if (status !== 'unlocked') {
            const message = status === 'locked'
                ? 'Gemini is configured but the key vault is locked. Unlock Settings to connect the live Advisor.'
                : 'No encrypted Gemini key is available yet. Add your Gemini access key in Settings to connect the live Advisor.';
            setAdvisorError(message);
            setMessages((prev) => [...prev, {
                id: `advisor-error-${Date.now()}`,
                sender: 'advisor',
                text: message,
                timestamp: new Date(),
            }]);
            return;
        }

        const apiKey = keys.gemini;
        if (!apiKey) {
            const message = 'Gemini key is not unlocked. Add or unlock the Gemini key in Settings, then try again.';
            setAdvisorError(message);
            setMessages((prev) => [...prev, {
                id: `advisor-error-${Date.now()}`,
                sender: 'advisor',
                text: message,
                timestamp: new Date(),
            }]);
            return;
        }

        setIsResponding(true);
        try {
            const profiles = loadRuntimeInterfaceProfiles();
            const model = profiles.gemini.model || 'gemini-1.5-pro';
            const response = await callGateway({
                provider: 'gemini',
                model,
                apiKey,
                messages: [
                    {
                        role: 'system',
                        content: [
                            'You are the live AEGIS Peer Commons AI Advisor.',
                            'Help Tracey operate the current workspace with concise, practical guidance.',
                            'Do not pretend to perform actions unless the app explicitly exposes that action.',
                            'When asked to create or add a whiteboard item, describe the proposed item clearly.',
                            'Respect that DataQuad authority stays VM-local and production lessons are live, not mock.',
                        ].join(' '),
                    },
                    ...messages.slice(-12).map((msg) => ({
                        role: msg.sender === 'advisor' ? 'assistant' as const : 'user' as const,
                        content: msg.text,
                    })),
                    {
                        role: 'user',
                        content: text,
                    },
                ],
            });

            const advisorText = response.text.trim() || 'Gemini returned an empty response.';
            setMessages((prev) => [...prev, {
                id: `advisor-${Date.now()}`,
                sender: 'advisor',
                text: advisorText,
                timestamp: new Date(),
            }]);

            const triggerAdvisorAction = text.toLowerCase().includes('create') || text.toLowerCase().includes('add');
            if (triggerAdvisorAction) {
                enqueueNodeAction({
                    type: 'create',
                    nodeType: 'proposal',
                    data: { label: 'Advisor Proposal', description: advisorText, author: 'AI Advisor' }
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gemini Advisor request failed.';
            const display = `Gemini Advisor request failed: ${message}`;
            setAdvisorError(display);
            setMessages((prev) => [...prev, {
                id: `advisor-error-${Date.now()}`,
                sender: 'advisor',
                text: display,
                timestamp: new Date(),
            }]);
        } finally {
            setIsResponding(false);
        }
    };

    const consumeQueue = () => {
        const current = [...whiteboardQueue];
        setWhiteboardQueue([]);
        return current;
    };

    return (
        <AdvisorContext.Provider value={{ messages, whiteboardQueue, isResponding, advisorError, addMessage, enqueueNodeAction, consumeQueue }}>
            {children}
        </AdvisorContext.Provider>
    );
}

export function useAdvisor() {
    const context = useContext(AdvisorContext);
    if (!context) {
        throw new Error('useAdvisor must be used within an AdvisorProvider');
    }
    return context;
}
