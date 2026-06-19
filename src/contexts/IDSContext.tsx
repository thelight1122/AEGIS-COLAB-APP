"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type IDSCard, type Attachment } from '../types';

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
    beginNewChat: () => void;
    attachNode: (cardId: string, nodeId: string) => void;
    removeCard: (cardId: string) => void;
    removeAttachment: (cardId: string, attachmentId: string) => void;
    setNodes: (nodes: NodeOption[]) => void;
    setFocusNode: (nodeId: string | null) => void;
    setIdsCards: (cards: IDSCard[]) => void;
}

const IDSContext = createContext<IDSContextType | undefined>(undefined);

export function IDSProvider({ children }: { children: ReactNode }) {
    const [idsCards, setIdsCards] = useState<IDSCard[]>([]);
    const [canvasNodes, setCanvasNodes] = useState<NodeOption[]>([]);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

    const addCard = useCallback((type: IDSCard['type'], content: string) => {
        const newCard: IDSCard = {
            id: `c-${Date.now()}`,
            type,
            content,
            authorId: 'p1', // Current User Fallback
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachments: []
        };
        setIdsCards(prev => [newCard, ...prev]);

        // Broadcast for observers (like ChamberLayout) to record governance
        const event = new CustomEvent('ids-card-added', { detail: { type, content, card: newCard } });
        window.dispatchEvent(event);
    }, []);

    const beginNewChat = useCallback(() => {
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

    const removeCard = useCallback((cardId: string) => {
        setIdsCards(prev => prev.filter(card => card.id !== cardId));
    }, []);

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
        setCanvasNodes(prev => {
            if (
                prev.length === nodes.length &&
                prev.every((node, idx) => (
                    node.id === nodes[idx]?.id &&
                    node.label === nodes[idx]?.label &&
                    node.type === nodes[idx]?.type
                ))
            ) {
                return prev;
            }
            return nodes;
        });
    }, []);

    const setFocusNode = useCallback((nodeId: string | null) => {
        setFocusNodeId(nodeId);
    }, []);

    const replaceIdsCards = useCallback((cards: IDSCard[]) => {
        setIdsCards(prev => {
            if (
                prev.length === cards.length &&
                prev.every((card, idx) => (
                    card.id === cards[idx]?.id &&
                    card.type === cards[idx]?.type &&
                    card.content === cards[idx]?.content &&
                    card.authorId === cards[idx]?.authorId &&
                    card.timestamp === cards[idx]?.timestamp
                ))
            ) {
                return prev;
            }
            return cards;
        });
    }, []);

    return (
        <IDSContext.Provider value={{
            idsCards,
            canvasNodes,
            focusNodeId,
            addCard,
            beginNewChat,
            attachNode,
            removeCard,
            removeAttachment,
            setNodes,
            setFocusNode,
            setIdsCards: replaceIdsCards
        }}>
            {children}
        </IDSContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIDS() {
    const context = useContext(IDSContext);
    if (!context) {
        throw new Error('useIDS must be used within an IDSProvider');
    }
    return context;
}
