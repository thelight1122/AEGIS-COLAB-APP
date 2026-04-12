/**
 * DataQuadContext — AEGIS Chamber ↔ Firebase Bridge
 *
 * Provides the Chamber with fire-and-forget DataQuad write hooks.
 * All writes are async and non-blocking — a Firebase error will never
 * crash the Chamber. Errors are logged only.
 *
 * Wiring points:
 *   seedChamberPeers  → call on Chamber mount with registryPeers + sessionId
 *   recordMessage     → call after each AI_CHAT_COMPLETED governance event
 *   recordContrib     → call after each CONTRIBUTION governance event
 *   finalizeSession   → call in handleCloseSession before navigation
 */

import React, { useCallback, useRef, useState } from 'react';
import {
    seedPeerSSP,
    appendLineage,
    recordAffect,
    recordResidual,
    setWorkingMemory,
    openSession,
    closeDataQuadSession,
} from '../services/dataquad';
import type { PeerProfile } from '../core/peers/types';
import type { AffectSignal, CoherenceSnapshot, ResidualSignal } from '../services/dataquad';
import {
    runIntegrityCoherenceGate,
    tickClock,
    resetClock,
} from '../core/governance/integrityClock';
import type { ClockState } from '../core/governance/integrityClock';
import { DataQuadContext } from './DataQuadContextBase';

// ── Provider ──────────────────────────────────────────────────────────────────

export function DataQuadProvider({ children }: { children: React.ReactNode }) {
    // Track which sessions we've already seeded — avoid duplicate writes across re-renders
    const seededSessions = useRef<Set<string>>(new Set());

    // Internal Clock — experience-time accumulator per session
    const clockMap = useRef<Map<string, ClockState>>(new Map());
    const [clockState, setClockState] = useState<ClockState | null>(null);

    const safe = useCallback((label: string, fn: () => Promise<void>) => {
        fn().catch(err => console.warn(`[DataQuad] ${label} failed:`, err));
    }, []);

    const resetSessionClock = useCallback((sessionId: string) => {
        const fresh = resetClock(sessionId);
        clockMap.current.set(sessionId, fresh);
        setClockState(fresh);
    }, []);

    const seedChamberPeers = useCallback((peers: PeerProfile[], sessionId: string) => {
        if (seededSessions.current.has(sessionId)) return;
        seededSessions.current.add(sessionId);

        // Initialize the Internal Clock for this session
        if (!clockMap.current.has(sessionId)) {
            const initial = resetClock(sessionId);
            clockMap.current.set(sessionId, initial);
            setClockState(initial);
        }

        const handles = peers.map(p => p.handle);

        safe('openSession', () => openSession(sessionId, handles));

        for (const peer of peers) {
            safe(`seedPeer ${peer.handle}`, async () => {
                const isBirth = await seedPeerSSP(peer);

                // Write the session_join lineage entry for every peer
                await appendLineage(peer.handle, {
                    event_type:   isBirth ? 'session_join' : 'session_join',
                    content:      isBirth
                        ? `${peer.handle} entered the AEGIS Coherence Chamber for the first time.`
                        : `${peer.handle} returned to the Chamber.`,
                    session_id:   sessionId,
                    participants: handles,
                });
            });
        }
    }, [safe]);

    const recordMessage = useCallback((
        peerId: string,
        content: string,
        sessionId: string,
        allHandles: string[]
    ) => {
        safe(`lineage:message:${peerId}`, () =>
            appendLineage(peerId, {
                event_type:   'message',
                content,
                session_id:   sessionId,
                participants: allHandles,
            })
        );
    }, [safe]);

    const recordContrib = useCallback((
        peerId: string,
        content: string,
        sessionId: string,
        allHandles: string[]
    ) => {
        safe(`lineage:contribution:${peerId}`, () =>
            appendLineage(peerId, {
                event_type:   'contribution',
                content,
                session_id:   sessionId,
                participants: allHandles,
            })
        );
    }, [safe]);

    const recordPeerAffect = useCallback((peerId: string, signal: AffectSignal) => {
        // Run through the Integrity Coherence Gate — identifies virtue + affect_type
        const gated = runIntegrityCoherenceGate(signal);

        // Tick the Internal Clock for this session
        const sessionId = signal.session_id;
        const current = clockMap.current.get(sessionId) ?? resetClock(sessionId);
        const next = tickClock(current, gated);
        clockMap.current.set(sessionId, next);
        setClockState(next);

        // Write the gate-enriched signal to Q2
        safe(`affect:${peerId}:${signal.affect_label}`, () =>
            recordAffect(peerId, gated)
        );
    }, [safe]);

    const setPeerWorkingMemory = useCallback((peerId: string, sessionId: string, content: string) => {
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
        safe(`working-memory:${peerId}:${sessionId}`, () =>
            setWorkingMemory(
                peerId,
                `pct-${sessionId}`,
                content,
                sessionId,
                expiresAt,
            )
        );
    }, [safe]);

    const recordPeerResidual = useCallback((peerId: string, signal: ResidualSignal) => {
        safe(`residual:${peerId}:${signal.pattern_key}`, () =>
            recordResidual(peerId, signal)
        );
    }, [safe]);

    const finalizeSession = useCallback((sessionId: string, coherence: CoherenceSnapshot) => {
        safe('closeSession', () => closeDataQuadSession(sessionId, coherence));
    }, [safe]);

    return (
        <DataQuadContext.Provider value={{
            seedChamberPeers,
            recordMessage,
            recordContrib,
            recordPeerAffect,
            setPeerWorkingMemory,
            recordPeerResidual,
            finalizeSession,
            clockState,
            resetSessionClock,
        }}>
            {children}
        </DataQuadContext.Provider>
    );
}
