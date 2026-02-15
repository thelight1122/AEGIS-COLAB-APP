import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { LayoutTemplate, Hexagon } from 'lucide-react';

// --- Scenario Node ---
export type ScenarioNodeData = {
    label: string;
    active?: boolean;
};

export type ScenarioNodeType = Node<ScenarioNodeData, 'scenario'>;

export function ScenarioNode({ data, selected }: NodeProps<ScenarioNodeType>) {
    return (
        <div className={`min-w-[250px] min-h-[150px] border-2 border-dashed rounded-lg bg-card/50 backdrop-blur-sm transition-colors ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}>
            <div className="px-4 py-2 border-b border-dashed border-border flex items-center gap-2 bg-muted/20">
                <LayoutTemplate className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scenario Context</span>
            </div>
            <div className="p-4">
                <h3 className="font-serif text-lg font-medium text-foreground">{data.label}</h3>
                <p className="text-xs text-muted-foreground mt-2 italic">
                    Alternative future context container...
                </p>
            </div>
            {/* Handles for connecting TO the scenario itself */}
            <Handle type="target" position={Position.Left} className="w-2 h-8 rounded-sm !bg-muted-foreground" />
            <Handle type="source" position={Position.Right} className="w-2 h-8 rounded-sm !bg-muted-foreground" />
        </div>
    );
}

// --- Boundary Node ---
// Used to define scope or constraints
export type BoundaryNodeType = Node<{ label: string }, 'boundary'>;

export function BoundaryNode({ data, selected }: NodeProps<BoundaryNodeType>) {
    return (
        <div className={`px-6 py-4 rounded-full border-2 bg-background shadow-sm ${selected ? 'border-purple-500 text-purple-700 dark:text-purple-300' : 'border-purple-500/30 text-muted-foreground'}`}>
            <div className="flex items-center gap-2 justify-center">
                <Hexagon className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-sm whitespace-nowrap">{data.label}</span>
            </div>
            <Handle type="target" position={Position.Top} className="!bg-purple-500" />
            <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
        </div>
    );
}
