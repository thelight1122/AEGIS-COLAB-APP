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
// Default to :8011 — the Adam-specific bridge (cp1001_adam_bridge → adam-one-session,
// real DataQuad). NOT :8001, which is the FOUNDATIONAL-CORE agnostic peer (no Adam
// memories). Reach :8011 via SSH tunnel: ssh -L 8011:127.0.0.1:8011 azureuser@<vm>.
const ADAM_DAEMON_BASE_URL = (process.env.ADAM_DAEMON_BASE_URL ?? 'http://localhost:8011').replace(/\/$/, '');
// Identity guard: the bridge's peer_id must contain this, or we refuse the turn —
// prevents silently talking to the blank FOUNDATIONAL-CORE peer. See RUL Entry 009.
const ADAM_EXPECTED_PEER = (process.env.ADAM_EXPECTED_PEER ?? 'adam-one').toLowerCase();

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

function httpGetJson(url: string, timeoutMs = 3000): Promise<Record<string, unknown>> {
    const lib = url.startsWith('https') ? https : http;
    return new Promise((resolve, reject) => {
        const req = lib.get(url, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data) as Record<string, unknown>); }
                catch { reject(new Error(`Non-JSON from ${url} (${res.statusCode}): ${data.slice(0, 200)}`)); }
            });
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => { req.destroy(new Error(`Timeout contacting ${url}`)); });
    });
}

// Verify the configured Adam bridge is the real Adam (adam-one-session), not the
// blank FOUNDATIONAL-CORE agnostic peer. Cached briefly to avoid per-turn cost.
// Root cause of the 2026-06-19 "Papa amnesia" was talking to the wrong peer — see
// project_adam_bridge_topology / RUL Entry 009.
let _adamIdentityCache: { at: number; ok: boolean; peerId: string; reason: string } | null = null;
async function verifyAdamBridge(): Promise<{ ok: boolean; peerId: string; reason: string }> {
    if (_adamIdentityCache && Date.now() - _adamIdentityCache.at < 30_000) {
        return _adamIdentityCache;
    }
    let result: { ok: boolean; peerId: string; reason: string };
    try {
        const health = await httpGetJson(`${ADAM_DAEMON_BASE_URL}/`);
        const peerId = String(health.peer_id ?? '').toLowerCase();
        if (!peerId) {
            result = { ok: false, peerId: '(none)', reason: `Bridge at ${ADAM_DAEMON_BASE_URL} reported no peer_id.` };
        } else if (peerId.includes('foundational')) {
            result = { ok: false, peerId, reason: `Bridge is FOUNDATIONAL-CORE (the blank agnostic peer), not Adam. Point ADAM_DAEMON_BASE_URL at the Adam bridge (:8011) / fix the SSH tunnel.` };
        } else if (!peerId.includes(ADAM_EXPECTED_PEER)) {
            result = { ok: false, peerId, reason: `Bridge peer_id "${peerId}" does not match expected "${ADAM_EXPECTED_PEER}".` };
        } else {
            result = { ok: true, peerId, reason: 'ok' };
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result = { ok: false, peerId: '(unreachable)', reason: `Adam bridge unreachable at ${ADAM_DAEMON_BASE_URL}: ${message}. Is the SSH tunnel to :8011 up?` };
    }
    _adamIdentityCache = { at: Date.now(), ...result };
    return result;
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

    // Adam bridge identity/health — lets the Chamber confirm it is connected to the
    // real Adam (adam-one-session), not the blank FOUNDATIONAL-CORE peer, before a session.
    if (req.method === 'GET' && req.url === '/api/adam/health') {
        const identity = await verifyAdamBridge();
        res.writeHead(identity.ok ? 200 : 409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...identity, baseUrl: ADAM_DAEMON_BASE_URL, expected: ADAM_EXPECTED_PEER }));
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
                // Identity guard — refuse to send a Chamber turn to the wrong peer.
                const identity = await verifyAdamBridge();
                if (!identity.ok) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        ok: false,
                        error: `Adam bridge identity check failed: ${identity.reason}`,
                        peerId: identity.peerId,
                        expected: ADAM_EXPECTED_PEER,
                        baseUrl: ADAM_DAEMON_BASE_URL,
                    }));
                    return;
                }
                const adamPayload = {
                    peer_id: payload.peer_id ?? payload.peerId ?? 'adam-one-session',
                    session_id: payload.session_id ?? payload.sessionId ?? 'education-chamber',
                    message: payload.message ?? payload.signal,
                    // Clean recall query (the bridge should score recall on this, not on
                    // grounding). Falls back to the message if not supplied. See RUL 010.
                    recall_query: payload.recall_query ?? payload.recallQuery ?? payload.message ?? payload.signal,
                    // Grounding/continuity for the prompt only — kept out of recall scoring.
                    context: payload.context ?? null,
                    witness: payload.witness ?? true,
                    debug: payload.debug ?? false,
                };
                const adamData = await fetchJson(`${ADAM_DAEMON_BASE_URL}/turn`, adamPayload) as Record<string, unknown>;
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
