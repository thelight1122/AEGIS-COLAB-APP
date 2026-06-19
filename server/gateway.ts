import http from 'http';
import https from 'https';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_PORT = Number.parseInt(process.env.GATEWAY_PORT ?? '8787', 10);
const PORT_ATTEMPTS = Number.parseInt(process.env.GATEWAY_PORT_ATTEMPTS ?? '25', 10);
const RUNTIME_DIR = path.resolve(process.cwd(), '.aegis-runtime');
const GATEWAY_PORT_FILE = path.join(RUNTIME_DIR, 'gateway-port.json');
const ANTHROPIC_VERSION = '2023-06-01';

function writeGatewayPort(port: number): void {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    fs.writeFileSync(
        GATEWAY_PORT_FILE,
        JSON.stringify({
            port,
            url: `http://localhost:${port}`,
            updatedAt: new Date().toISOString(),
        }, null, 2),
    );
}

function listenWithFallback(serverInstance: http.Server, startPort: number, attempts: number): void {
    let port = startPort;
    const maxPort = startPort + Math.max(0, attempts - 1);

    const tryListen = (): void => {
        const handleListening = (): void => {
            serverInstance.off('error', handleError);
            writeGatewayPort(port);
            console.log(`LLM Gateway running on http://localhost:${port}`);
        };

        const handleError = (error: NodeJS.ErrnoException): void => {
            serverInstance.off('error', handleError);
            serverInstance.off('listening', handleListening);

            if (error.code === 'EADDRINUSE' && port < maxPort) {
                console.warn(`LLM Gateway port ${port} is busy; trying ${port + 1}`);
                port += 1;
                tryListen();
                return;
            }

            throw error;
        };

        serverInstance.once('error', handleError);
        serverInstance.once('listening', handleListening);
        serverInstance.listen(port);
    };

    tryListen();
}

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

    // Launch OBS for session recording
    if (req.method === 'POST' && req.url === '/api/launch-obs') {
        const obsPaths = [
            'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
            'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe',
        ];
        const obsPath = obsPaths.find(p => fs.existsSync(p));
        if (obsPath) {
            spawn(obsPath, [], { detached: true, stdio: 'ignore' }).unref();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'OBS not found at standard install paths' }));
        }
        return;
    }

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

    // Health probe — server-side fetch so browser CORS is not a factor for remote Ollama/LMStudio
    if (req.method === 'POST' && req.url === '/api/probe-health') {
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', async () => {
            try {
                const { url } = JSON.parse(rawBody) as { url: string };
                if (!url || typeof url !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, reason: 'url is required' }));
                    return;
                }

                const lib = url.startsWith('https') ? https : http;
                const probeResult = await new Promise<{ ok: boolean; status: number }>((resolve) => {
                    const probeReq = lib.request(url, { method: 'GET' }, (probeRes) => {
                        probeRes.resume(); // drain body
                        resolve({ ok: (probeRes.statusCode ?? 0) < 400 || probeRes.statusCode === 401, status: probeRes.statusCode ?? 0 });
                    });
                    probeReq.setTimeout(5000, () => { probeReq.destroy(); resolve({ ok: false, status: 0 }); });
                    probeReq.on('error', () => resolve({ ok: false, status: 0 }));
                    probeReq.end();
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(probeResult));
            } catch (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, status: 0 }));
            }
        });
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

                    console.log(`[Gateway] ${provider} → ${url} | model: ${model} | messages: ${messages.length}`);
                    const oaiData = await fetchJson(url, { model, messages }, headers) as OpenAIResponse;
                    console.log(`[Gateway] ${provider} ← response text length: ${oaiData.choices?.[0]?.message?.content?.length ?? 0}`);

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

listenWithFallback(server, DEFAULT_PORT, PORT_ATTEMPTS);
