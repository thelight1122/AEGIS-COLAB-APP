export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    raw?: any;
}

export interface ChatOptions {
    provider: string;
    model: string;
    messages: ChatMessage[];
    baseURL?: string;
    apiKey?: string;
    stream?: boolean;
}

export interface LLMAdapter {
    completeChat(options: ChatOptions): Promise<ChatResponse>;
}

import { geminiAdapter } from './geminiAdapter';
import { openaiAdapter } from './openaiAdapter';
import { xaiAdapter } from './xaiAdapter';
import { openaiCompatAdapter } from './openaiCompatAdapter';

export const getAdapter = (provider: string): LLMAdapter => {
    switch (provider.toLowerCase()) {
        case 'gemini': return geminiAdapter;
        case 'openai': return openaiAdapter;
        case 'xai':
        case 'grok': return xaiAdapter;
        case 'local':
        case 'openaicompat': return openaiCompatAdapter;
        default: return openaiCompatAdapter;
    }
};
