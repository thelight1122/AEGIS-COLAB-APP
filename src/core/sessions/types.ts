import type { GovernanceEvent } from "../governance/types";

export type SessionStatus = "Draft" | "Active" | "Closed" | "Abandoned";

export type Session = {
    id: string;
    artifactId: string;
    status: SessionStatus;
    startedAt?: number;
    lastActiveAt?: number;
    closedAt?: number;
    participants: string[]; // peer IDs
    eventLog: GovernanceEvent[]; // append-only governance events (min)
    whiteboardStateRef?: string;
    lockedVersionRef?: string; // optional reference to artifact version produced
    abandonmentReason?: string;
    hostHandle?: string;
    lessonMode?: 'one-on-one' | 'ai-peer';
    headmasterIds?: string[];
    formationPhase?: 'orienting' | 'exploring' | 'integrating' | 'releasing';
};
