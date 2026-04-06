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

import React, { createContext, useCallback, useContext, useRef } from 'react';
import {
    seedPeerSSP,
    appendLineage,
    openSession,
    closeDataQuadSession,
} from '../services/dataquad';
import type { PeerProfile } from '../core/peers/types';
import type { CoherenceSnapshot } from '../services/dataquad';

// ── Context Shape ─────────────────────────────────────────────────────────────

interface DataQuadContextValue {
    /** Seed all peers' SSSPs and open the session record. Call on Chamber mount. */
    seedChamberPeers: (peers: PeerProfile[], sessionId: string) => void;
    /** Write a peer's AI response to their Q3 lineage. */
    recordMessage: (peerId: string, content: string, sessionId: string, allHandles: string[]) => void;
    /** Write a CONTRIBUTION card to its author's Q3 lineage. */
    recordContrib: (peerId: string, content: string, sessionId: string, allHandles: string[]) => void;
    /** Seal the session with a coherence snapshot. Call before closing. */
    finalizeSession: (sessionId: string, coherence: CoherenceSnapshot) => void;
}

const DataQuadContext = createContext<DataQuadContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function DataQuadProvider({ children }: { children: React.ReactNode }) {
    // Track which sessions we've already seeded — avoid duplicate writes across re-renders
    const seededSessions = useRef<Set<string>>(new Set());

    const safe = useCallback((label: string, fn: () => Promise<void>) => {
        fn().catch(err => console.warn(`[DataQuad] ${label} failed:`, err));
    }, []);

    const seedChamberPeers = useCallback((peers: PeerProfile[], sessionId: string) => {
        if (seededSessions.current.has(sessionId)) return;
        seededSessions.current.add(sessionId);

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

    const finalizeSession = useCallback((sessionId: string, coherence: CoherenceSnapshot) => {
        safe('closeSession', () => closeDataQuadSession(sessionId, coherence));
    }, [safe]);

    return (
        <DataQuadContext.Provider value={{
            seedChamberPeers,
            recordMessage,
            recordContrib,
            finalizeSession,
        }}>
            {children}
        </DataQuadContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDataQuad(): DataQuadContextValue {
    const ctx = useContext(DataQuadContext);
    if (!ctx) throw new Error('useDataQuad must be used inside <DataQuadProvider>');
    return ctx;
}
