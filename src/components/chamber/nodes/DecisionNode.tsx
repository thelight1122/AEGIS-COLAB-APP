import { Handle, Position } from '@xyflow/react';
import { cn } from '../../../lib/utils';
import { Check, X, ShieldAlert } from 'lucide-react';

interface DecisionNodeProps {
    data: {
        label?: string;
        state?: 'approved' | 'denied' | 'pending';
        details?: string;
    };
    selected?: boolean;
}

export function DecisionNode({ data, selected }: DecisionNodeProps) {
    const stateConfig = {
        approved: {
            bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
            icon: Check,
            label: "Approved"
        },
        denied: {
            bg: "bg-destructive/10 border-destructive/30 text-destructive",
            icon: X,
            label: "Denied"
        },
        pending: {
            bg: "bg-amber-500/10 border-amber-500/30 text-amber-500",
            icon: ShieldAlert,
            label: "Pending"
        }
    };

    const config = stateConfig[data.state || 'pending'];
    const Icon = config.icon;

    return (
        <div className="relative group">
            {/* Handles placed on points of the diamond */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground z-10" />
            
            <div className={cn(
                "w-24 h-24 flex items-center justify-center transform rotate-45 border-2 shadow-sm transition-shadow",
                selected ? "ring-2 ring-primary border-transparent shadow-md" : "hover:shadow-md",
                config.bg
            )}>
                {/* Content counter-rotated to stay upright */}
                <div className="transform -rotate-45 flex flex-col items-center justify-center text-center p-2">
                    <Icon className="w-5 h-5 mb-1" />
                    <div className="text-[10px] font-bold uppercase tracking-wider">
                        {data.label || "Decision"}
                    </div>
                    {data.details && (
                        <div className="text-[8px] text-muted-foreground line-clamp-1">
                            {data.details}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground z-10" />
        </div>
    );
}
