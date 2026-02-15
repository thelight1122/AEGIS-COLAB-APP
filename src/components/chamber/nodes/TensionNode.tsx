import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Zap } from 'lucide-react';

export type TensionNodeData = {
    label: string;
    description?: string;
    intensity?: 'low' | 'medium' | 'high';
};

export type TensionNodeType = Node<TensionNodeData, 'tension'>;

export function TensionNode({ data, selected }: NodeProps<TensionNodeType>) {
    const intensityColors = {
        low: 'text-yellow-500 bg-yellow-500/10 border-l-yellow-500',
        medium: 'text-orange-500 bg-orange-500/10 border-l-orange-500',
        high: 'text-red-500 bg-red-500/10 border-l-red-500',
    };

    const colorClass = intensityColors[data.intensity || 'medium'];

    return (
        <BaseNode selected={selected} className={`border-l-4 ${colorClass.split(' ').pop()} min-w-[180px]`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${colorClass.split(' ').slice(0, 2).join(' ')} mt-1`}>
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-semibold text-sm leading-tight text-foreground">{data.label}</h4>
                    {data.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {data.description}
                        </p>
                    )}
                    <div className="mt-2 text-[10px] font-mono text-muted-foreground bg-muted inline-block px-1.5 rounded">
                        INTENSITY: {(data.intensity || 'medium').toUpperCase()}
                    </div>
                </div>
            </div>

            <Handle type="target" position={Position.Top} className="!bg-orange-500" />
            <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
        </BaseNode>
    );
}
