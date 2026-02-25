import { type InclusionState } from '../core/governance/types';

export interface Peer {
    id: string;
    name: string;
    avatar?: string;
    type: 'human' | 'ai';
    role: string;
    status: 'online' | 'offline' | 'busy';
    matchScore?: number; // 0-100 relevance
    acknowledged: boolean;
    domains: string[];
}

export interface BoardPeer {
    id: string;
    handle: string;
    display_name: string;
    peer_type: 'human' | 'ai';
    auth_user_id?: string;
    is_active?: boolean;
}

export interface Thread {
    id: string;
    title: string;
    created_at: string;
    created_by_peer_id?: string;
}

export interface Message {
    id: string;
    thread_id: string;
    author_peer_id: string;
    author_peer_type: 'human' | 'ai';
    body: string;
    kind: string;
    created_at: string;
}

export interface IDSCard {
    id: string;
    type: 'identification' | 'definition' | 'suggestion' | 'freeform';
    content: string;
    authorId: string;
    timestamp: string;
    attachments?: Attachment[];
}

export interface Attachment {
    id: string;
    type: 'node' | 'proposal' | 'section';
    label: string;
    targetId: string;
}

export interface LensStatus {
    name: string;
    status: 'active' | 'missing' | 'deferred';
    domains: string[];
    deferralRationale?: string;
}

export interface TelemetryData {
    inclusionScore: number;
    drift: number;
    convergence: number;
    lenses: LensStatus[];
    lockAvailable: boolean;
    activeDomains: string[];
    inclusion?: InclusionState; // Pass formal state through for advanced UI logic
}

// Lock threshold constants
export const LOCK_INCLUSION_THRESHOLD = 75;


// Dummy Data
export const MOCK_PEERS: Peer[] = [];

export const MOCK_IDS_FEED: IDSCard[] = [];

export const MOCK_TELEMETRY: TelemetryData = {
    inclusionScore: 0,
    drift: 0,
    convergence: 0,
    lenses: [],
    lockAvailable: false,
    activeDomains: [],
};

// --- Artifact Archive Types ---

export interface ArtifactVersion {
    id: string;
    label: string;
    timestamp: string;
    status: 'locked' | 'draft' | 'archived';
    inclusionScore: number;
    proposalIds: string[];
    domains: string[];
}

export interface Proposal {
    id: string;
    title: string;
    author: string;
    status: 'accepted' | 'rejected' | 'pending';
    summary: string;
    versionId: string;
}

export interface ConsiderationEntry {
    id: string;
    proposalId: string;
    peerName: string;
    lens: string;
    verdict: 'support' | 'oppose' | 'abstain';
    note: string;
}

export const MOCK_VERSIONS: ArtifactVersion[] = [];

export const MOCK_PROPOSALS: Proposal[] = [];

export const MOCK_CONSIDERATIONS: ConsiderationEntry[] = [];

// --- Session History Types ---

export interface HistoricalSession {
    id: string;
    name: string;
    date: string;
    duration: string;
    participants: {
        human: number;
        ai: number;
    };
    summary: string;
    finalInclusionScore: number;
    outcomes: {
        artifactsCount: number;
        proposalsCount: number;
    };
}

export const MOCK_SESSIONS: HistoricalSession[] = [];
