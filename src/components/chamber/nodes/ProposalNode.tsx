import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { FileText } from 'lucide-react';

export type ProposalNodeData = {
    label: string;
    description?: string;
    author?: string;
};

export type ProposalNodeType = Node<ProposalNodeData, 'proposal'>;

export function ProposalNode({ data, selected }: NodeProps<ProposalNodeType>) {
    return (
        <BaseNode selected={selected} className="border-l-4 border-l-blue-500 min-w-[200px]">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-md text-blue-500 mt-1">
                    <FileText className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-semibold text-sm leading-tight text-foreground">{data.label}</h4>
                    {data.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                            {data.description}
                        </p>
                    )}
                    {data.author && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70 uppercase tracking-widest font-medium">
                            <span>BY {data.author}</span>
                        </div>
                    )}
                </div>
            </div>
            {/* Custom handles if needed, otherwise BaseNode handles apply if we used them there. 
                BaseNode has default handles. We can override if necessary by adding Handle components here 
                with specific IDs or styles, but BaseNode's are fine for now. */}
            <Handle type="target" position={Position.Top} className="!bg-blue-500" />
            <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
        </BaseNode>
    );
}
