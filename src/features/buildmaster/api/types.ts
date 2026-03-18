export type ToolInfo = { name: string; description: string };

export type BuildMasterInfo = { 
    bmId: string; 
    displayName: string; 
    dataquad?: DataQuad; 
};

export type DataQuad = {
    cognitive?: Record<string, any>;
    affective?: Record<string, any>;
    operational?: Record<string, any>;
    relational?: Record<string, any>;
};

export type CreateBmRequest = {
    bmId?: string;
    displayName?: string;
    dataquad?: DataQuad;
};

export type RunBmRequest = {
    bmId: string;
    text: string;
    meta?: Record<string, any>;
};

export type TrainingInjectRequest = {
    bmId: string;
    context: string;
    detail?: string;
    tags?: string[];
};

export type DeployRecordRequest = {
    bmId: string;
    pattern: string;
    evidenceRefs?: string[];
};

export type AegisReadAll = {
    peer: any[];
    pct: any[];
    nct: any[];
    spine: any[];
    projects?: any[];
    teams?: any[];
    tasks?: any[];
    runs?: any[];
};

export type Project = {
    projectId: string;
    name: string;
    repo?: string;
    localPath?: string;
    defaultBranch?: string;
    createdTs: string;
};

export type TeamMember = {
    bmId: string;
    role: string;
};

export type Team = {
    teamId: string;
    name: string;
    members: TeamMember[];
    createdTs: string;
};

export type Task = {
    taskId: string;
    title: string;
    intent: string;
    constraints: string[];
    deliverables: string[];
    createdTs: string;
};

export type RunStatus = 'created' | 'running' | 'completed' | 'failed' | 'halted';

export type Run = {
    runId: string;
    projectId: string;
    teamId: string;
    taskId?: string;
    toolIds?: string[];
    status: RunStatus;
    createdTs: string;
    startedTs?: string;
    endedTs?: string;
    events?: string[];
    outputs?: { text?: string };
};

export interface Tool {
    name: string;
    description: string;
    inputSchema?: any;
}

export interface Skill {
    id: string;
    path: string;
    name?: string;
    description?: string;
    instructions?: string;
}

export type RunEventKind =
    | 'log'
    | 'error'
    | 'artifact'
    | 'system'
    | 'agent.requested'
    | 'agent.started'
    | 'agent.step'
    | 'agent.completed'
    | 'agent.errored'
    | 'agent.note'
    | 'agent.pause_requested'
    | 'agent.paused'
    | 'agent.resume_requested'
    | 'agent.resumed'
    | 'agent.stop_requested'
    | 'agent.stopped'
    | 'tool.requested'
    | 'tool.started'
    | 'tool.completed'
    | 'tool.errored'
    | 'tool_call'
    | 'tool_result';

export interface RunEvent {
    id: string;
    runId: string;
    seq: number;
    ts: string;
    kind: RunEventKind;
    message: string;
    data_json?: any;
}
