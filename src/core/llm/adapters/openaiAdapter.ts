import { type ChatOptions, type ChatResponse, type LLMAdapter } from './index';
import { openaiCompatAdapter } from './openaiCompatAdapter';

export const openaiAdapter: LLMAdapter = {
    async completeChat(options: ChatOptions): Promise<ChatResponse> {
        return openaiCompatAdapter.completeChat({
            ...options,
            baseURL: 'https://api.openai.com/v1',
        });
    }
};
