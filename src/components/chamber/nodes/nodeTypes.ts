import type { ProposalNodeType } from './ProposalNode';
import type { TensionNodeType } from './TensionNode';
import type { ScenarioNodeType, BoundaryNodeType } from './StructureNodes';


export type AppNode = ProposalNodeType | TensionNodeType | ScenarioNodeType | BoundaryNodeType;
