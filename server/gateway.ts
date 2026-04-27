import http from 'http';
import https from 'https';

const PORT = 8787;
const ANTHROPIC_VERSION = '2023-06-01';

// ── fetchJson ─────────────────────────────────────────────────────────────────
// Rejects on non-2xx status codes so callers see real upstream failures.

async function fetchJson(
    url: string,
    body: unknown,
    headers: Record<string, string> = { 'Content-Type': 'application/json' },
): Promise<unknown> {
    const lib = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
        const req = lib.request(url, { method: 'POST', headers }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed: unknown;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    reject(new Error(`Non-JSON response from ${url} (${res.statusCode}): ${data}`));
                    return;
                }
                if ((res.statusCode ?? 200) >= 300) {
                    reject(new Error(`Upstream ${res.statusCode} from ${url}: ${data}`));
                } else {
                    resolve(parsed);
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ── Response interfaces ───────────────────────────────────────────────────────

interface GeminiResponse {
    candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}

interface OpenAIResponse {
    choices?: Array<{ message?: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface AnthropicResponse {
    content?: Array<{ text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
}

// ── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Health check
    if (req.method === 'GET' && req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            providers: ['openai', 'gemini', 'anthropic', 'xai', 'local'],
            timestamp: new Date().toISOString(),
        }));
        return;
    }

    // LLM Chat
    if (req.method === 'POST' && req.url === '/api/llm/chat') {
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', async () => {
            try {
                const options = JSON.parse(rawBody);
                const { provider, model, messages, baseURL } = options;

                // P1 fix: prefer per-request apiKey over env var
                const envKey = `${provider.toUpperCase()}_API_KEY`;
                const apiKey: string | undefined = options.apiKey || process.env[envKey];

                let responsePayload: unknown;

                // ── Gemini ────────────────────────────────────────────────────
                if (provider === 'gemini' || provider === 'google') {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
                    const contents = messages
                        .filter((m: { role: string }) => m.role !== 'system')
                        .map((m: { role: string; content: string }) => ({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: m.content }],
                        }));

                    const geminiData = await fetchJson(url, {
                        contents,
                        ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage.content }] } } : {}),
                    }) as GeminiResponse;

                    responsePayload = {
                        text: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        usage: geminiData.usageMetadata ? {
                            promptTokens: geminiData.usageMetadata.promptTokenCount,
                            completionTokens: geminiData.usageMetadata.candidatesTokenCount,
                            totalTokens: geminiData.usageMetadata.totalTokenCount,
                        } : undefined,
                        raw: geminiData,
                    };

                // ── Anthropic / Claude ────────────────────────────────────────
                } else if (provider === 'anthropic' || provider === 'claude') {
                    const url = 'https://api.anthropic.com/v1/messages';
                    const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
                    const chatMessages = messages
                        .filter((m: { role: string }) => m.role !== 'system')
                        .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

                    const anthropicData = await fetchJson(
                        url,
                        {
                            model,
                            max_tokens: 4096,
                            ...(systemMessage ? { system: systemMessage.content } : {}),
                            messages: chatMessages,
                        },
                        {
                            'Content-Type': 'application/json',
                            'x-api-key': apiKey ?? '',
                            'anthropic-version': ANTHROPIC_VERSION,
                        },
                    ) as AnthropicResponse;

                    responsePayload = {
                        text: anthropicData.content?.[0]?.text || '',
                        usage: anthropicData.usage ? {
                            promptTokens: anthropicData.usage.input_tokens,
                            completionTokens: anthropicData.usage.output_tokens,
                            totalTokens: (anthropicData.usage.input_tokens ?? 0) + (anthropicData.usage.output_tokens ?? 0),
                        } : undefined,
                        raw: anthropicData,
                    };

                // ── OpenAI-compatible (openai, xai, lmstudio, ollama, etc.) ──
                } else {
                    const defaultBase = provider === 'xai' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1';
                    const url = `${baseURL || defaultBase}/chat/completions`;
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

                    const oaiData = await fetchJson(url, { model, messages }, headers) as OpenAIResponse;

                    responsePayload = {
                        text: oaiData.choices?.[0]?.message?.content || '',
                        usage: oaiData.usage ? {
                            promptTokens: oaiData.usage.prompt_tokens,
                            completionTokens: oaiData.usage.completion_tokens,
                            totalTokens: oaiData.usage.total_tokens,
                        } : undefined,
                        raw: oaiData,
                    };
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(responsePayload));

            } catch (err: unknown) {
                console.error('Gateway Error:', err);
                // P2 fix: propagate upstream status in error response
                const message = err instanceof Error ? err.message : String(err);
                const upstreamMatch = message.match(/^Upstream (\d+)/);
                const statusCode = upstreamMatch ? parseInt(upstreamMatch[1], 10) : 500;
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log(`LLM Gateway running on http://localhost:${PORT}`);
});
