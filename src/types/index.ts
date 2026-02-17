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
export const MOCK_PEERS: Peer[] = [
    { id: 'p1', name: 'User', type: 'human', role: 'Facilitator', status: 'online', acknowledged: false, domains: ['Operational Layer'] },
    { id: 'p2', name: 'Atlas (AI)', type: 'ai', role: 'Systems Lens', status: 'online', matchScore: 95, acknowledged: false, domains: ['Engineering', 'Operational Layer'] },
    { id: 'p3', name: 'Sarah', type: 'human', role: 'Product', status: 'busy', matchScore: 40, acknowledged: false, domains: ['Product'] },
    { id: 'p4', name: 'Critique (AI)', type: 'ai', role: 'Risks Lens', status: 'online', matchScore: 80, acknowledged: false, domains: ['Security', 'Risks'] },
];

export const MOCK_IDS_FEED: IDSCard[] = [
    { id: 'c1', type: 'identification', content: 'Potential drift in user retention logic identified.', authorId: 'p2', timestamp: '10:42 AM' },
    { id: 'c2', type: 'definition', content: 'Defining "Coherence" as state synchronization across all peers.', authorId: 'p1', timestamp: '10:45 AM' },
    { id: 'c3', type: 'suggestion', content: 'We should visualize the drift metric more prominently.', authorId: 'p3', timestamp: '10:48 AM' },
];

export const MOCK_TELEMETRY: TelemetryData = {
    inclusionScore: 78,
    drift: 12,
    convergence: 45,
    lenses: [
        { name: 'Product', status: 'active', domains: ['Product'] },
        { name: 'Engineering', status: 'active', domains: ['Engineering'] },
        { name: 'Design', status: 'active', domains: ['Design'] },
        { name: 'Security', status: 'missing', domains: ['Security'] },
        { name: 'Legal', status: 'missing', domains: ['Legal'] },
    ],
    lockAvailable: false,
    activeDomains: ['Operational Layer', 'Canon Integrity'],
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

export const MOCK_VERSIONS: ArtifactVersion[] = [
    { id: 'v1', label: 'v0.1 — Initial Draft', timestamp: '2026-02-10 09:00', status: 'archived', inclusionScore: 55, proposalIds: ['pr1'], domains: ['Engineering'] },
    { id: 'v2', label: 'v0.2 — Peer Review', timestamp: '2026-02-12 14:30', status: 'archived', inclusionScore: 72, proposalIds: ['pr2', 'pr3'], domains: ['Product', 'Engineering'] },
    { id: 'v3', label: 'v0.3 — Current', timestamp: '2026-02-14 11:15', status: 'locked', inclusionScore: 91, proposalIds: ['pr4', 'pr5', 'pr6'], domains: ['Design', 'UX'] },
    { id: 'v4', label: 'v0.4 — Working', timestamp: '2026-02-15 08:00', status: 'draft', inclusionScore: 78, proposalIds: ['pr7'], domains: ['Operational Layer', 'Canon Integrity'] },
];

export const MOCK_PROPOSALS: Proposal[] = [
    { id: 'pr1', title: 'Initial RAG Pipeline Sketch', author: 'User', status: 'accepted', summary: 'Rough vector search integration with 500ms latency budget.', versionId: 'v1' },
    { id: 'pr2', title: 'Add Caching Layer', author: 'Atlas (AI)', status: 'accepted', summary: 'Redis-based embedding cache to reduce repeat lookups by 60%.', versionId: 'v2' },
    { id: 'pr3', title: 'Switch to Pinecone', author: 'Sarah', status: 'rejected', summary: 'Migrate from pgvector to Pinecone for managed scaling.', versionId: 'v2' },
    { id: 'pr4', title: 'Streaming Responses', author: 'User', status: 'accepted', summary: 'Server-sent events for real-time token streaming.', versionId: 'v3' },
    { id: 'pr5', title: 'Rate Limiting Middleware', author: 'Critique (AI)', status: 'accepted', summary: 'Token-bucket rate limiter at 100 req/min per user.', versionId: 'v3' },
    { id: 'pr6', title: 'A/B Test Framework', author: 'Sarah', status: 'pending', summary: 'Feature flag system for controlled rollouts.', versionId: 'v3' },
    { id: 'pr7', title: 'Multi-modal Input Support', author: 'Atlas (AI)', status: 'pending', summary: 'Accept image and audio inputs alongside text.', versionId: 'v4' },
];

export const MOCK_CONSIDERATIONS: ConsiderationEntry[] = [
    { id: 'ce1', proposalId: 'pr4', peerName: 'Atlas (AI)', lens: 'Systems', verdict: 'support', note: 'SSE is lightweight and well-suited for our architecture.' },
    { id: 'ce2', proposalId: 'pr4', peerName: 'Sarah', lens: 'Product', verdict: 'support', note: 'Users expect real-time feedback.' },
    { id: 'ce3', proposalId: 'pr5', peerName: 'User', lens: 'Facilitator', verdict: 'support', note: 'Essential for production stability.' },
    { id: 'ce4', proposalId: 'pr5', peerName: 'Critique (AI)', lens: 'Risks', verdict: 'support', note: 'Prevents abuse, protects infrastructure.' },
    { id: 'ce5', proposalId: 'pr6', peerName: 'Atlas (AI)', lens: 'Systems', verdict: 'abstain', note: 'Need more detail on implementation.' },
    { id: 'ce6', proposalId: 'pr6', peerName: 'Critique (AI)', lens: 'Risks', verdict: 'oppose', note: 'Adds complexity without clear ROI at this stage.' },
    { id: 'ce7', proposalId: 'pr3', peerName: 'Atlas (AI)', lens: 'Systems', verdict: 'oppose', note: 'Vendor lock-in risk; pgvector is sufficient for current scale.' },
    { id: 'ce8', proposalId: 'pr3', peerName: 'User', lens: 'Facilitator', verdict: 'oppose', note: 'Cost implications not justified.' },
];

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

export const MOCK_SESSIONS: HistoricalSession[] = [
    {
        id: 's1',
        name: 'RAG Architecture Sync',
        date: '2026-02-14',
        duration: '45m',
        participants: { human: 2, ai: 2 },
        summary: 'Finalized the transition to server-sent events for streaming and established the initial rate-limiting parameters.',
        finalInclusionScore: 91,
        outcomes: { artifactsCount: 1, proposalsCount: 3 }
    },
    {
        id: 's2',
        name: 'UI Design Review',
        date: '2026-02-12',
        duration: '1h 10m',
        participants: { human: 3, ai: 1 },
        summary: 'Evaluated the new dark mode aesthetics and verified responsiveness across the sidebar and telemetry panels.',
        finalInclusionScore: 84,
        outcomes: { artifactsCount: 2, proposalsCount: 5 }
    },
    {
        id: 's3',
        name: 'Security Audit - Phase 1',
        date: '2026-02-10',
        duration: '35m',
        participants: { human: 1, ai: 2 },
        summary: 'Initial identification of risk factors in the persistence layer. Deferred deep-dive on encryption to next session.',
        finalInclusionScore: 78,
        outcomes: { artifactsCount: 1, proposalsCount: 2 }
    }
];
