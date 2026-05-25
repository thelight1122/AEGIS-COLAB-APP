import { type ChatOptions, type ChatResponse } from './adapters';
import { normalizeLocalEndpoint } from '../providers/localEndpoint';

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

    // Live turns prefer the gateway. Direct local calls are an explicit
    // diagnostics/development fallback for local providers only.
    const isLocalFallbackEnabled = localStorage.getItem('aegis_local_fallback') === 'true';

    if (isLocalFallbackEnabled && ['local', 'lmstudio', 'ollama'].includes(options.provider) && options.baseURL) {
        console.info('Falling back to direct local provider call');
        const baseURL = normalizeLocalEndpoint(options.baseURL) ?? options.baseURL;
        const resp = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(options.apiKey ? { 'Authorization': `Bearer ${options.apiKey}` } : {})
            },
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
