import type { ProposalNodeType } from './ProposalNode';
import type { TensionNodeType } from './TensionNode';
import type { ScenarioNodeType, BoundaryNodeType } from './StructureNodes';

export type ImageNodeType = {
    id: string;
    type: 'image';
    position: { x: number; y: number };
    data: { label?: string; imageUrl?: string; alt?: string };
    selected?: boolean;
};

export type AgentNodeType = {
    id: string;
    type: 'agent';
    position: { x: number; y: number };
    data: { label?: string; role?: string; status?: 'active' | 'idle' | 'offline'; avatarUrl?: string };
    selected?: boolean;
};

export type DecisionNodeType = {
    id: string;
    type: 'decision';
    position: { x: number; y: number };
    data: { label?: string; state?: 'approved' | 'denied' | 'pending'; details?: string };
    selected?: boolean;
};

export type AppNode = 
    | ProposalNodeType 
    | TensionNodeType 
    | ScenarioNodeType 
    | BoundaryNodeType
    | ImageNodeType
    | AgentNodeType
    | DecisionNodeType;
