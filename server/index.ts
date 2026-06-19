import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import {
    runPipeline,
    getSession,
    resetSession,
    type StewardIncoming,
} from './steward-core.js';

const DEFAULT_PORT = Number.parseInt(process.env.GATEWAY_PORT ?? '9090', 10);
const PORT_ATTEMPTS = Number.parseInt(process.env.GATEWAY_PORT_ATTEMPTS ?? '25', 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNTIME_DIR = path.resolve(__dirname, '../.aegis-runtime');
const GATEWAY_PORT_FILE = path.join(RUNTIME_DIR, 'gateway-port.json');
const STEWARD_PORT_FILE = path.join(RUNTIME_DIR, 'steward-port.json');
const ANTHROPIC_VERSION = '2023-06-01';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://20.115.97.102:11434').replace(/\/$/, '');
const ADAM_DAEMON_BASE_URL = (process.env.ADAM_DAEMON_BASE_URL ?? 'http://localhost:8789').replace(/\/$/, '');

function writePorts(port: number): void {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    fs.writeFileSync(
        GATEWAY_PORT_FILE,
        JSON.stringify({
            port,
            url: `http://localhost:${port}`,
            updatedAt: new Date().toISOString(),
        }, null, 2),
    );
    fs.writeFileSync(
        STEWARD_PORT_FILE,
        JSON.stringify({
            port,
            url: `ws://localhost:${port}`,
            updatedAt: new Date().toISOString(),
        }, null, 2),
    );
}

// ── fetchJson ─────────────────────────────────────────────────────────────────
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

function proxyToOllama(req: http.IncomingMessage, res: http.ServerResponse): void {
    const upstreamPath = (req.url ?? '/').replace(/^\/api\/ollama/, '') || '/';
    const target = new URL(upstreamPath, OLLAMA_BASE_URL);
    const lib = target.protocol === 'https:' ? https : http;

    const headers = { ...req.headers };
    delete headers.host;

    const upstreamReq = lib.request(target, {
        method: req.method,
        headers,
    }, (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
    });

    upstreamReq.on('error', (error) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: `Ollama proxy failed: ${error instanceof Error ? error.message : String(error)}`,
        }));
    });

    req.pipe(upstreamReq);
}

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

const DIST_DIR = path.resolve(__dirname, '../dist');

async function serveStaticFile(reqPath: string, res: http.ServerResponse): Promise<boolean> {
    // Prevent directory traversal attacks and strip leading slashes/backslashes
    const cleanPath = reqPath.replace(/^[/\\]+/, '');
    const safePath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(DIST_DIR, safePath);

    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            if (!fs.existsSync(filePath)) {
                return false;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return true;
    } catch {
        return false;
    }
}

// ── Unified HTTP Server ───────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Health probe — server-side fetch so browser CORS is not a factor for remote endpoints
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
                        probeRes.resume();
                        resolve({ ok: (probeRes.statusCode ?? 0) < 400 || probeRes.statusCode === 401, status: probeRes.statusCode ?? 0 });
                    });
                    probeReq.setTimeout(5000, () => { probeReq.destroy(); resolve({ ok: false, status: 0 }); });
                    probeReq.on('error', () => resolve({ ok: false, status: 0 }));
                    probeReq.end();
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(probeResult));
            } catch {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, status: 0 }));
            }
        });
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

    if (req.url?.startsWith('/api/ollama')) {
        proxyToOllama(req, res);
        return;
    }

    // Adam DataQuad turn proxy — keeps browser calls same-origin while the
    // server talks to the VM-local Adam daemon through the SSH tunnel.
    if (req.method === 'POST' && req.url === '/api/adam/turn') {
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(rawBody);
                const adamPayload = {
                    peer_id: payload.peer_id ?? payload.peerId ?? 'adam-one-session',
                    session_id: payload.session_id ?? payload.sessionId ?? 'education-chamber',
                    message: payload.message ?? payload.signal,
                    witness: payload.witness ?? true,
                    debug: payload.debug ?? false,
                };
                const adamData = await fetchJson(`${ADAM_DAEMON_BASE_URL}/turn`, adamPayload);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    ...adamData,
                    response: adamData.response ?? adamData.answer ?? '',
                }));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                const upstreamMatch = message.match(/^Upstream (\d+)/);
                const statusCode = upstreamMatch ? Number.parseInt(upstreamMatch[1], 10) : 502;
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: message }));
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

                const envKey = `${provider.toUpperCase()}_API_KEY`;
                const apiKey: string | undefined = options.apiKey || process.env[envKey];

                let responsePayload: unknown;

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
                const message = err instanceof Error ? err.message : String(err);
                const upstreamMatch = message.match(/^Upstream (\d+)/);
                const statusCode = upstreamMatch ? Number.parseInt(upstreamMatch[1], 10) : 500;
                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: message }));
            }
        });
        return;
    }

    // Serve static files from dist/ (if it exists)
    if (req.method === 'GET' && !req.url?.startsWith('/api')) {
        const cleanUrl = req.url!.split(/[?#]/)[0];
        const urlPath = cleanUrl === '/' ? 'index.html' : cleanUrl;
        const served = await serveStaticFile(urlPath, res);
        if (served) return;

        // Fallback to index.html for React SPA routing
        const fallbackServed = await serveStaticFile('index.html', res);
        if (fallbackServed) return;
    }

    res.writeHead(404);
    res.end();
});

// ── WebSocket Server ──────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

wss.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') return;
    console.error('[STEWARD] WebSocket server error:', error);
});

wss.on('connection', (ws: WebSocket) => {
    console.log('[STEWARD] Chamber connected');

    ws.on('message', async (data: Buffer) => {
        try {
            const msg = JSON.parse(data.toString()) as StewardIncoming;

            if (msg.type === 'SESSION_RESET') {
                resetSession(msg.session_id);
                console.log(`[STEWARD] Session reset: ${msg.session_id}`);
                return;
            }

            if (msg.type === 'EXCHANGE') {
                const state = getSession(msg.session_id);
                const report = await runPipeline(msg, state);

                const significant = report.findings.filter(f => f.severity !== 'info');
                if (significant.length > 0) {
                    console.log(`[STEWARD] ${msg.session_id} | ${msg.role} | ${significant.map(f => f.kind).join(', ')}`);
                }

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(report));
                }
            }
        } catch (err) {
            console.error('[STEWARD] Pipeline error:', err);
        }
    });

    ws.on('close', () => {
        console.log('[STEWARD] Chamber disconnected');
    });

    ws.on('error', (err) => {
        console.error('[STEWARD] WebSocket error:', err);
    });
});

// ── Listen With Fallback ──────────────────────────────────────────────────────
function listenWithFallback(serverInstance: http.Server, startPort: number, attempts: number): void {
    let port = startPort;
    const maxPort = startPort + Math.max(0, attempts - 1);

    const tryListen = (): void => {
        const handleListening = (): void => {
            serverInstance.off('error', handleError);
            writePorts(port);
            console.log(`[SERVER] Unified HTTP & WebSocket server running on http://localhost:${port}`);
            console.log(`[SERVER] Steward Daemon listening on ws://localhost:${port}`);
        };

        const handleError = (error: NodeJS.ErrnoException): void => {
            serverInstance.off('error', handleError);
            serverInstance.off('listening', handleListening);

            if (error.code === 'EADDRINUSE' && port < maxPort) {
                console.warn(`[SERVER] Port ${port} is busy; trying ${port + 1}`);
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

listenWithFallback(server, DEFAULT_PORT, PORT_ATTEMPTS);
