import { createContext, useContext } from 'react';
import type { PeerProfile } from '../core/peers/types';
import type { ClockState } from '../core/governance/integrityClock';
import type { AffectSignal, CoherenceSnapshot, ResidualSignal } from '../services/dataquad';
import type { PeerEntry } from '../../server/peer.js';
import type { SpineEntry } from '../../server/spine.js';
import type { BookcaseEntry } from '../../server/bookcase.js';

export interface DataQuadContextValue {
    seedChamberPeers: (peers: PeerProfile[], sessionId: string) => void;
    recordMessage: (peerId: string, content: string, sessionId: string, allHandles: string[]) => void;
    recordContrib: (peerId: string, content: string, sessionId: string, allHandles: string[]) => void;
    recordPeerAffect: (peerId: string, signal: AffectSignal) => void;
    setPeerWorkingMemory: (peerId: string, sessionId: string, content: string) => void;
    recordPeerResidual: (peerId: string, signal: ResidualSignal) => void;
    finalizeSession: (sessionId: string, coherence: CoherenceSnapshot) => void;
    clockState: ClockState | null;
    resetSessionClock: (sessionId: string) => void;
    /** Persist a PEER entry from runPipeline to Firebase (fire-and-forget) */
    persistPeerEntry: (sessionId: string, entry: PeerEntry) => void;
    /** Persist a promoted SPINE entry from the promoter to Firebase (fire-and-forget) */
    persistSpineEntry: (entry: SpineEntry) => void;
    /** Persist a HOLD-state Bookcase entry to Firebase (fire-and-forget) */
    persistBookcaseEntry: (entry: BookcaseEntry) => void;
}

export const DataQuadContext = createContext<DataQuadContextValue | null>(null);

export function useDataQuad(): DataQuadContextValue {
    const ctx = useContext(DataQuadContext);
    if (!ctx) throw new Error('useDataQuad must be used inside <DataQuadProvider>');
    return ctx;
}
