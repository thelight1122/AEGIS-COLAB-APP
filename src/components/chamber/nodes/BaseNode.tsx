import { Handle, Position } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import type { ReactNode } from 'react';

export interface BaseNodeProps {
    children?: ReactNode;
    className?: string;
    label?: string;
    selected?: boolean;
}

export function BaseNode({ children, className, selected, label }: BaseNodeProps) {
    return (
        <div className={cn(
            "min-w-[150px] shadow-sm rounded-md bg-card border border-border transition-shadow",
            selected ? "ring-2 ring-primary border-transparent shadow-md" : "hover:shadow-md",
            className
        )}>
            {/* Default Handles - can be overridden or augmented by specific nodes if needed, 
                 but this provides a standard entry/exit for simple flow */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />

            {label && (
                <div className="px-3 py-1 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-t-md">
                    {label}
                </div>
            )}

            <div className="p-3">
                {children}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground" />
        </div>
    );
}
