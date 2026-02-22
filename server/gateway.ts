import http from 'http';
import https from 'https';

const PORT = 8787;

async function fetchJson(url: string, body: unknown, headers: Record<string, string> = { 'Content-Type': 'application/json' }) {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
        const req = lib.request(url, {
            method: 'POST',
            headers,
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error(`Failed to parse response from ${url}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            providers: ["openai", "gemini", "xai", "local"],
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // LLM Chat
    if (req.method === 'POST' && req.url === '/api/llm/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const options = JSON.parse(body);
                const { provider, model, messages, baseURL } = options;

                const envKey = `${provider.toUpperCase()}_API_KEY`;
                const apiKey = process.env[envKey];

                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                let responseData: unknown;

                interface GeminiResponse {
                    candidates?: Array<{
                        content?: {
                            parts?: Array<{ text: string }>;
                        };
                    }>;
                    usageMetadata?: {
                        promptTokenCount: number;
                        candidatesTokenCount: number;
                        totalTokenCount: number;
                    };
                }

                interface OpenAIResponse {
                    choices?: Array<{
                        message?: {
                            content: string;
                        };
                    }>;
                    usage?: {
                        prompt_tokens: number;
                        completion_tokens: number;
                        total_tokens: number;
                    };
                }

                if (provider === 'gemini') {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    const contents = messages.map((m: { role: string, content: string }) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }));
                    const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
                    const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

                    responseData = await fetchJson(url, {
                        contents: contents.filter((m: { parts: { text: string }[] }) => messages.find((x: { content: string }) => x.content === m.parts[0].text).role !== 'system'),
                        systemInstruction,
                    });

                    const geminiData = responseData as GeminiResponse;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        text: geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        usage: geminiData.usageMetadata ? {
                            promptTokens: geminiData.usageMetadata.promptTokenCount,
                            completionTokens: geminiData.usageMetadata.candidatesTokenCount,
                            totalTokens: geminiData.usageMetadata.totalTokenCount,
                        } : undefined,
                        raw: geminiData
                    }));
                } else {
                    const defaultBaseURL = provider === 'xai' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1';
                    const actualBaseURL = baseURL || defaultBaseURL;
                    const url = `${actualBaseURL}/chat/completions`;

                    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

                    responseData = await fetchJson(url, { model, messages }, headers);
                    const oaiData = responseData as OpenAIResponse;

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        text: oaiData.choices?.[0]?.message?.content || '',
                        usage: oaiData.usage ? {
                            promptTokens: oaiData.usage.prompt_tokens,
                            completionTokens: oaiData.usage.completion_tokens,
                            totalTokens: oaiData.usage.total_tokens,
                        } : undefined,
                        raw: oaiData
                    }));
                }

            } catch (err: unknown) {
                console.error('Gateway Error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                const errorMessage = err instanceof Error ? err.message : String(err);
                res.end(JSON.stringify({ error: errorMessage }));
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
