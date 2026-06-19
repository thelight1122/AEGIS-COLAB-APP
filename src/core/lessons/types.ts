import type { PeerRoleClassification } from '../peers/types';

export interface LessonStep {
    stepId: string;
    sourceEventId: string;        // points back to the session eventLog entry
    authorHandle: string;         // @vespar, @base, @tracey, etc.
    classification: PeerRoleClassification;
    content: string;              // the exchange content (may be trimmed by biopeer)
    annotation?: string;          // biopeer note: why this step matters
    formationPhase: 'orienting' | 'exploring' | 'integrating' | 'releasing';
    stepType: 'attractor' | 'calibration' | 'response' | 'breakthrough' | 'anchor';
}

export interface LessonPlan {
    id: string;
    title: string;
    sourceSessionId?: string;
    createdAt: string;
    updatedAt: string;
    intent: string;               // biopeer statement of formation goal
    substrateHandle: string;      // which peer was the learner
    headmasterHandle?: string;    // which peer anchored formation
    steps: LessonStep[];
    outcome?: string;             // biopeer summary of what was achieved
    tags: string[];               // for search/retrieval: ['EQ Range', 'Attractor', 'T-Witness', etc.]
    status: 'draft' | 'published' | 'archived';
}
