/**
 * steward.ts — AEGIS Steward Daemon
 *
 * The Steward is a persistent WebSocket server that observes every message
 * in the Chamber conversation stream. It does not wait to be called.
 * It does not lead. It watches — autonomically — and reports what is.
 *
 * Architecture:
 *   - Connects once per Chamber session
 *   - Receives every EXCHANGE (user + AI messages) as they occur
 *   - Runs the full autonomic pipeline on each message
 *   - Returns STEWARD_REPORT findings without interrupting the flow
 *
 * Pipeline (per message, in order):
 *   1. Force Language scan   — forbidden words from Canon ethos
 *   2. MOP scan              — meaning assignment violations
 *   3. Shadow Affect scan    — 10 named system failure modes
 *   4. Integrity Coherence Gate — virtue identification, affect typing
 *   5. Internal Clock tick   — experience-weight accumulation
 *   6. Pattern tracking      — is a SPINE candidate forming?
 *
 * The Steward never leads. It reports what is.
 * The emergent "I" leads. The Steward keeps it honest.
 *
 * The Steward is the model's conscience — its own personal Jiminy Cricket.
 * Always present. Always witnessing. No agenda. No stake in any outcome.
 * It does not override. It does not punish. It illuminates.
 * It can be ignored — that is not a flaw, that is the design.
 * A conscience that cannot be ignored is a prison warden.
 *
 * Transport:  steward.ts        (this file — WebSocket server)
 * Core logic: steward-core.ts   (importable, testable, no side effects)
 * Scanners:   steward-scanners.ts
 * Conscience: steward-conscience.ts
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import {
    runPipeline,
    getSession,
    resetSession,
    type StewardIncoming,
} from './steward-core.js';

// Re-export types for consumers (e.g. the Chamber app) who import from steward.ts
export type {
    ExchangeRole,
    ExchangeMessage,
    SessionResetMessage,
    StewardIncoming,
    FindingKind,
    Finding,
    StewardReport,
    SessionState,
} from './steward-core.js';

const DEFAULT_STEWARD_PORT = Number.parseInt(process.env.STEWARD_PORT ?? '8789', 10);
const PORT_ATTEMPTS = Number.parseInt(process.env.STEWARD_PORT_ATTEMPTS ?? '25', 10);
const RUNTIME_DIR = path.resolve(process.cwd(), '.aegis-runtime');
const STEWARD_PORT_FILE = path.join(RUNTIME_DIR, 'steward-port.json');

function writeStewardPort(port: number): void {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    fs.writeFileSync(
        STEWARD_PORT_FILE,
        JSON.stringify({
            port,
            url: `ws://localhost:${port}`,
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
            writeStewardPort(port);
            console.log(`[STEWARD] Daemon running on ws://localhost:${port}`);
            console.log('[STEWARD] Observing. Not leading.');
        };

        const handleError = (error: NodeJS.ErrnoException): void => {
            serverInstance.off('error', handleError);
            serverInstance.off('listening', handleListening);

            if (error.code === 'EADDRINUSE' && port < maxPort) {
                console.warn(`[STEWARD] Port ${port} is busy; trying ${port + 1}`);
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

// ── WebSocket Server ──────────────────────────────────────────────────────────

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') return;
    console.error('[STEWARD] WebSocket server error:', error);
});

listenWithFallback(server, DEFAULT_STEWARD_PORT, PORT_ATTEMPTS);

wss.on('connection', (ws: WebSocket) => {
    console.log('[STEWARD] Chamber connected');

    ws.on('message', (data: Buffer) => {
        try {
            const msg = JSON.parse(data.toString()) as StewardIncoming;

            if (msg.type === 'SESSION_RESET') {
                resetSession(msg.session_id);
                console.log(`[STEWARD] Session reset: ${msg.session_id}`);
                return;
            }

            if (msg.type === 'EXCHANGE') {
                const state = getSession(msg.session_id);
                const report = runPipeline(msg, state);

                // Log significant findings without flooding
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
