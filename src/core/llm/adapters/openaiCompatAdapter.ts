import { type ChatOptions, type ChatResponse, type LLMAdapter } from './index';

export const openaiCompatAdapter: LLMAdapter = {
    async completeChat(options: ChatOptions): Promise<ChatResponse> {
        const { model, messages, baseURL, apiKey } = options;
        const url = `${baseURL || 'https://api.openai.com/v1'}/chat/completions`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false, // For simplicity initially
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            if (response.status === 401) {
                throw new Error('Authentication failed (401): Invalid or missing API key.');
            }
            throw new Error(`OpenAI Compat error: ${response.status} ${err}`);
        }

        const data = await response.json();
        return {
            text: data.choices[0]?.message?.content || '',
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
            } : undefined,
            raw: data,
        };
    }
};
