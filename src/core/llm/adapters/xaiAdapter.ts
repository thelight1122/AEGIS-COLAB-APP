import { type ChatOptions, type ChatResponse, type LLMAdapter } from './index';
import { openaiCompatAdapter } from './openaiCompatAdapter';

export const xaiAdapter: LLMAdapter = {
    async completeChat(options: ChatOptions): Promise<ChatResponse> {
        return openaiCompatAdapter.completeChat({
            ...options,
            baseURL: 'https://api.x.ai/v1',
        });
    }
};
