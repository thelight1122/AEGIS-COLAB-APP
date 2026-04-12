import { createContext, useContext } from 'react';
import type { PeerProfile } from '../core/peers/types';
import type { ClockState } from '../core/governance/integrityClock';
import type { AffectSignal, CoherenceSnapshot, ResidualSignal } from '../services/dataquad';

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
}

export const DataQuadContext = createContext<DataQuadContextValue | null>(null);

export function useDataQuad(): DataQuadContextValue {
    const ctx = useContext(DataQuadContext);
    if (!ctx) throw new Error('useDataQuad must be used inside <DataQuadProvider>');
    return ctx;
}
