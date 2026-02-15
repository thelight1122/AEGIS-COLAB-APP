import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type IDSCard, type Attachment, MOCK_IDS_FEED } from '../types';

interface NodeOption {
    id: string;
    label: string;
    type: string;
}

interface IDSContextType {
    idsCards: IDSCard[];
    canvasNodes: NodeOption[];
    focusNodeId: string | null;
    addCard: (type: IDSCard['type'], content: string) => void;
    clearStream: () => void;
    attachNode: (cardId: string, nodeId: string) => void;
    removeAttachment: (cardId: string, attachmentId: string) => void;
    setNodes: (nodes: NodeOption[]) => void;
    setFocusNode: (nodeId: string | null) => void;
}

const IDSContext = createContext<IDSContextType | undefined>(undefined);

export function IDSProvider({ children }: { children: ReactNode }) {
    const [idsCards, setIdsCards] = useState<IDSCard[]>(MOCK_IDS_FEED);
    const [canvasNodes, setCanvasNodes] = useState<NodeOption[]>([]);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

    const addCard = useCallback((type: IDSCard['type'], content: string) => {
        const newCard: IDSCard = {
            id: `c-${Date.now()}`,
            type,
            content,
            authorId: 'p1', // Current User
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachments: []
        };
        setIdsCards(prev => [newCard, ...prev]);
    }, []);

    const clearStream = useCallback(() => {
        setIdsCards([]);
    }, []);

    const attachNode = useCallback((cardId: string, nodeId: string) => {
        setIdsCards(prev => prev.map(card => {
            if (card.id !== cardId) return card;
            const node = canvasNodes.find(n => n.id === nodeId);
            if (!node) return card;
            const existing = card.attachments || [];
            if (existing.some(a => a.targetId === nodeId)) return card;
            const newAttachment: Attachment = {
                id: `att-${Date.now()}`,
                type: 'node',
                label: node.label,
                targetId: nodeId,
            };
            return { ...card, attachments: [...existing, newAttachment] };
        }));
    }, [canvasNodes]);

    const removeAttachment = useCallback((cardId: string, attachmentId: string) => {
        setIdsCards(prev => prev.map(card => {
            if (card.id !== cardId) return card;
            return {
                ...card,
                attachments: (card.attachments || []).filter(a => a.id !== attachmentId),
            };
        }));
    }, []);

    const setNodes = useCallback((nodes: NodeOption[]) => {
        setCanvasNodes(nodes);
    }, []);

    const setFocusNode = useCallback((nodeId: string | null) => {
        setFocusNodeId(nodeId);
    }, []);

    return (
        <IDSContext.Provider value={{
            idsCards,
            canvasNodes,
            focusNodeId,
            addCard,
            clearStream,
            attachNode,
            removeAttachment,
            setNodes,
            setFocusNode
        }}>
            {children}
        </IDSContext.Provider>
    );
}

export function useIDS() {
    const context = useContext(IDSContext);
    if (!context) {
        throw new Error('useIDS must be used within an IDSProvider');
    }
    return context;
}
