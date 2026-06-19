// DataQuad belongs on the Core VM server. Browser-side Commons code keeps only
// the in-memory Internal Clock; Steward/Advocate are the VM-local write path.

import React, { useCallback, useRef, useState } from 'react';
import {
    runIntegrityCoherenceGate,
    tickClock,
    resetClock,
} from '../core/governance/integrityClock';
import type { ClockState } from '../core/governance/integrityClock';
import { DataQuadContext } from './DataQuadContextBase';
import type { DataQuadContextValue } from './DataQuadContextBase';
import type { AffectSignal } from '../services/dataquad';

export function DataQuadProvider({ children }: { children: React.ReactNode }) {
    const clockMap = useRef<Map<string, ClockState>>(new Map());
    const [clockState, setClockState] = useState<ClockState | null>(null);

    const resetSessionClock = useCallback((sessionId: string) => {
        const fresh = resetClock(sessionId);
        clockMap.current.set(sessionId, fresh);
        setClockState(fresh);
    }, []);

    const recordPeerAffect = useCallback((_peerId: string, signal: AffectSignal) => {
        const gated = runIntegrityCoherenceGate(signal);
        const current = clockMap.current.get(signal.session_id) ?? resetClock(signal.session_id);
        const next = tickClock(current, gated);
        clockMap.current.set(signal.session_id, next);
        setClockState(next);
    }, []);

    const value: DataQuadContextValue = {
        seedChamberPeers: () => {},
        recordMessage: () => {},
        recordContrib: () => {},
        recordPeerAffect,
        setPeerWorkingMemory: () => {},
        recordPeerResidual: () => {},
        finalizeSession: () => {},
        clockState,
        resetSessionClock,
        persistPeerEntry: () => {},
        persistSpineEntry: () => {},
        persistBookcaseEntry: () => {},
    };

    return (
        <DataQuadContext.Provider value={value}>
            {children}
        </DataQuadContext.Provider>
    );
}
