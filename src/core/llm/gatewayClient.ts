import { type ChatOptions, type ChatResponse } from './adapters';

export async function callGateway(options: ChatOptions): Promise<ChatResponse> {
    try {
        const response = await fetch('/api/llm/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
        });

        if (response.ok) {
            return await response.json();
        }

        // If not OK, and it's a local provider, we might want to fallback if configured
        const errorText = await response.text();
        console.warn('Gateway returned error, checking for fallback:', errorText);

    } catch (e) {
        console.warn('Gateway unreachable, checking for fallback:', e);
    }

    // Direct fallback for local providers (e.g. LM Studio)
    const isLocalFallbackEnabled = localStorage.getItem('aegis_local_fallback') === 'true';

    if (isLocalFallbackEnabled && options.provider === 'local' && options.baseURL) {
        console.info('Falling back to direct local call for LM Studio');
        const resp = await fetch(`${options.baseURL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: options.model,
                messages: options.messages
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            return {
                text: data.choices?.[0]?.message?.content || '',
                usage: data.usage ? {
                    promptTokens: data.usage.prompt_tokens,
                    completionTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                } : undefined,
                raw: data
            };
        }
    }

    throw new Error('Gateway request failed and no fallback available.');
}
