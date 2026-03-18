import { createContext, useContext, useState, ReactNode } from 'react';

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
    addMessage: (text: string, sender: 'user' | 'advisor', attachments?: AdvisorMessage['attachments']) => void;
    enqueueNodeAction: (action: WhiteboardAction) => void;
    consumeQueue: () => WhiteboardAction[];
}

const AdvisorContext = createContext<AdvisorContextType | undefined>(undefined);

export function AdvisorProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<AdvisorMessage[]>([
        { id: '1', sender: 'advisor', text: 'Greetings Peer. I am your AI Advisor. How can I assist with your workspace today?', timestamp: new Date() }
    ]);
    const [whiteboardQueue, setWhiteboardQueue] = useState<WhiteboardAction[]>([]);

    const addMessage = (text: string, sender: 'user' | 'advisor', attachments?: AdvisorMessage['attachments']) => {
        const newMessage: AdvisorMessage = {
            id: `msg-${Date.now()}`,
            sender,
            text,
            timestamp: new Date(),
            attachments
        };
        setMessages((prev) => [...prev, newMessage]);

        // Mock automatic response from advisor for prototype
        if (sender === 'user') {
            setTimeout(() => {
                const triggerAdvisorAction = text.toLowerCase().includes('create') || text.toLowerCase().includes('add');
                const advisorResponse: AdvisorMessage = {
                    id: `msg-${Date.now() + 1}`,
                    sender: 'advisor',
                    text: triggerAdvisorAction 
                        ? "Understood. I have queued a whiteboard element for your workspace frame layout."
                        : `Received: "${text}". I am monitoring alignment constraints.`,
                    timestamp: new Date()
                };
                setMessages((prev) => [...prev, advisorResponse]);

                if (triggerAdvisorAction) {
                    enqueueNodeAction({
                        type: 'create',
                        nodeType: 'proposal',
                        data: { label: 'Advisor Proposal', description: `Generated from prompt: "${text}"`, author: 'AI Advisor' }
                    });
                }
            }, 1000);
        }
    };

    const enqueueNodeAction = (action: WhiteboardAction) => {
        setWhiteboardQueue((prev) => [...prev, action]);
    };

    const consumeQueue = () => {
        const current = [...whiteboardQueue];
        setWhiteboardQueue([]);
        return current;
    };

    return (
        <AdvisorContext.Provider value={{ messages, whiteboardQueue, addMessage, enqueueNodeAction, consumeQueue }}>
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
