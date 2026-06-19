// DataQuad belongs on the Core VM server. This app only keeps local Education
// and Collaboration types; Steward/Advocate handle VM-local DataQuad writes.

export interface LineageEvent {
    event_type: 'session_join' | 'session_close' | 'message' | 'contribution' | 'acknowledgement' | 'lock';
    content: string;
    session_id: string;
    participants: string[];
}

export interface AffectSignal {
    session_id: string;
    affect_label: string;
    intensity: number;
    direction: number;
    trigger: string;
    virtue?: string;
    affect_type?: string;
    clock_weight?: number;
    repair_path?: string | null;
}

export interface CoherenceSnapshot {
    inclusion_score: number;
    drift_signal: number;
    convergence_rate: number;
}

export interface PeerContextRead {
    handle: string;
    name?: string;
    provider?: string;
    model?: string;
    status?: string;
    receipt: string;
    continuityVersion: string;
    lineage: string[];
}

export interface ResidualSignal {
    pattern_key: string;
    label: string;
    valence: 1 | -1;
    summary: string;
    source_kind: 'orientation' | 'citation' | 'affect' | 'resonance';
    source_session_id: string;
    source_turn_id?: string;
    recurrence_count: number;
}

// No-op stubs — DataQuad writes happen through Steward/Advocate on the VM server, not here.
export async function readPeerContext(_peerId: string, _sessionId: string): Promise<PeerContextRead> {
    return { handle: _peerId, receipt: '', continuityVersion: 'local', lineage: [] };
}
