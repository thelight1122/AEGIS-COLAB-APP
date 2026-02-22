import { type GovernanceEvent } from './types';

export interface ChatThreadMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    peerId?: string;
    timestamp: number;
    status?: 'success' | 'error';
    errorDetails?: string;
}

export function deriveChatThread(events: GovernanceEvent[]): ChatThreadMessage[] {
    let messages: ChatThreadMessage[] = [];
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

    for (const event of sortedEvents) {
        if (event.type === 'SESSION_CLEARED') {
            messages = [];
        } else if (event.type === 'AI_CHAT_REQUESTED') {
            messages.push({
                id: `req-${event.timestamp}`,
                role: 'user',
                content: event.prompt,
                timestamp: event.timestamp
            });
        } else if (event.type === 'AI_CHAT_COMPLETED') {
            messages.push({
                id: `res-${event.timestamp}`,
                role: 'assistant',
                peerId: event.peerId,
                content: event.responseText,
                timestamp: event.timestamp,
                status: 'success'
            });
        } else if (event.type === 'AI_CHAT_FAILED') {
            messages.push({
                id: `err-${event.timestamp}`,
                role: 'assistant',
                peerId: event.peerId,
                content: 'Failed to generate response.',
                timestamp: event.timestamp,
                status: 'error',
                errorDetails: event.error
            });
        }
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
}
