import type { ConnectedModel, ModelProvider } from '../../types/commons';
import { normalizeLocalEndpoint } from './localEndpoint';

type FetchLike = typeof fetch;

export interface SubstrateInterfaceValidationInput {
    provider: ModelProvider;
    model: string;
    type: 'hosted' | 'local';
    endpointUrl?: string;
    apiKey?: string;
    fetchImpl?: FetchLike;
}

export interface SubstrateInterfaceValidationResult {
    ok: boolean;
    reason?: string;
}

export async function validateSubstrateInterface(input: SubstrateInterfaceValidationInput): Promise<SubstrateInterfaceValidationResult> {
    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    if (!fetchImpl) return { ok: false, reason: 'Fetch API is unavailable in this runtime.' };
    if (!input.model.trim()) return { ok: false, reason: 'Model name is required.' };

    if (input.provider === 'lmstudio' || input.provider === 'ollama') {
        return validateLocalSubstrateInterface(input, fetchImpl);
    }

    return validateHostedSubstrateInterface(input, fetchImpl);
}

export async function validateParticipantRuntime(model: ConnectedModel, apiKey?: string): Promise<SubstrateInterfaceValidationResult> {
    return validateSubstrateInterface({
        provider: model.provider,
        model: model.model,
        type: model.type,
        endpointUrl: model.endpointUrl,
        apiKey: model.apiKey || apiKey,
    });
}

async function validateLocalSubstrateInterface(input: SubstrateInterfaceValidationInput, fetchImpl: FetchLike): Promise<SubstrateInterfaceValidationResult> {
    if (!input.endpointUrl) {
        return { ok: false, reason: `${labelProvider(input.provider)} substrate interface validation requires a base URL.` };
    }

    const baseURL = normalizeLocalEndpoint(input.endpointUrl) ?? input.endpointUrl;
    const urls = input.provider === 'ollama'
        ? [modelListUrl(baseURL), ollamaTagsUrl(baseURL)]
        : [modelListUrl(baseURL)];

    // Probe via the local gateway so remote Ollama/LMStudio endpoints are
    // validated server-side, avoiding CORS failures for non-localhost URLs.
    // Falls back to direct fetch when fetchImpl is overridden (tests).
    const useGatewayProbe = input.fetchImpl == null;

    let lastReason = '';
    for (const url of urls) {
        try {
            if (useGatewayProbe) {
                const res = await globalThis.fetch('/api/probe-health', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });
                const data = res.ok ? (await res.json() as { ok: boolean; reason?: string }) : { ok: false };
                if (data.ok) return { ok: true };
                lastReason = data.reason ?? 'probe returned not-ok';
            } else {
                const response = await fetchImpl(url, {
                    method: 'GET',
                    headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : undefined,
                });
                if (response.ok || response.status === 401) {
                    return { ok: true };
                }
                lastReason = `${response.status} ${await safeReadText(response)}`.trim();
            }
        } catch (error) {
            lastReason = error instanceof Error ? error.message : String(error);
        }
    }

    return {
        ok: false,
        reason: `${labelProvider(input.provider)} substrate interface validation failed: ${lastReason || 'models probe was unreachable.'}`,
    };
}

async function validateHostedSubstrateInterface(input: SubstrateInterfaceValidationInput, fetchImpl: FetchLike): Promise<SubstrateInterfaceValidationResult> {
    if (!input.apiKey) {
        return { ok: false, reason: `${labelProvider(input.provider)} substrate interface validation requires an API key.` };
    }

    const request = hostedValidationRequest(input);
    try {
        const response = await fetchImpl(request.url, request.init);
        if (response.ok) return { ok: true };
        return {
            ok: false,
            reason: `${labelProvider(input.provider)} substrate interface validation failed: ${response.status} ${await safeReadText(response)}`.trim(),
        };
    } catch (error) {
        return {
            ok: false,
            reason: `${labelProvider(input.provider)} substrate interface validation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

function hostedValidationRequest(input: SubstrateInterfaceValidationInput): { url: string; init: RequestInit } {
    switch (input.provider) {
        case 'gemini':
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(input.apiKey ?? '')}`,
                init: { method: 'GET' },
            };
        case 'anthropic':
            return {
                url: 'https://api.anthropic.com/v1/models',
                init: {
                    method: 'GET',
                    headers: {
                        'x-api-key': input.apiKey ?? '',
                        'anthropic-version': '2023-06-01',
                    },
                },
            };
        case 'xai':
            return openAICompatibleModelsRequest('https://api.x.ai/v1', input.apiKey);
        case 'openai':
        default:
            return openAICompatibleModelsRequest('https://api.openai.com/v1', input.apiKey);
    }
}

function openAICompatibleModelsRequest(baseURL: string, apiKey?: string): { url: string; init: RequestInit } {
    return {
        url: `${baseURL}/models`,
        init: {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey ?? ''}` },
        },
    };
}

function modelListUrl(baseURL: string): string {
    return baseURL.endsWith('/v1') ? `${baseURL}/models` : `${baseURL}/v1/models`;
}

function ollamaTagsUrl(baseURL: string): string {
    const url = new URL(baseURL);
    url.pathname = '/api/tags';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
}

async function safeReadText(response: Response): Promise<string> {
    try {
        return (await response.text()).slice(0, 240);
    } catch {
        return '';
    }
}

function labelProvider(provider: ModelProvider): string {
    switch (provider) {
        case 'lmstudio':
            return 'LM Studio';
        case 'ollama':
            return 'Ollama';
        case 'openai':
            return 'OpenAI';
        case 'gemini':
            return 'Gemini';
        case 'anthropic':
            return 'Anthropic';
        case 'xai':
            return 'xAI';
    }
}
