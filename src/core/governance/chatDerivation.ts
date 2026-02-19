import { type GovernanceEvent } from './types';

export interface ChatThreadMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    peerId?: string;
    timestamp: number;
}

export function deriveChatThread(events: GovernanceEvent[]): ChatThreadMessage[] {
    const messages: ChatThreadMessage[] = [];

    for (const event of events) {
        if (event.type === 'AI_CHAT_REQUESTED') {
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
                timestamp: event.timestamp
            });
        }
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
}
