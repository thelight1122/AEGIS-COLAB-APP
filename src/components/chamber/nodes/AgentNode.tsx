import { BaseNode } from './BaseNode';
import { Bot, Radio } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AgentNodeProps {
    data: {
        label?: string;
        role?: string;
        status?: 'active' | 'idle' | 'offline';
        avatarUrl?: string;
    };
    selected?: boolean;
}

export function AgentNode({ data, selected }: AgentNodeProps) {
    const statusColors = {
        active: "bg-emerald-500",
        idle: "bg-amber-500",
        offline: "bg-muted-foreground/50"
    };

    return (
        <BaseNode selected={selected} label={data.label || "AI Agent"} className="min-w-[220px] max-w-[280px]">
            <div className="flex flex-col items-center p-2 text-center">
                <div className="relative mb-3">
                    {data.avatarUrl ? (
                        <img 
                            src={data.avatarUrl} 
                            alt={data.label} 
                            className="w-16 h-16 rounded-full border-2 border-primary/20 object-cover"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <Bot className="w-8 h-8 text-primary" />
                        </div>
                    )}
                    
                    <span className={cn(
                        "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background",
                        statusColors[data.status || 'idle']
                    )} />
                </div>

                <div className="space-y-1">
                    <div className="text-sm font-semibold tracking-tight">
                        {data.label || "Unnamed Peer"}
                    </div>
                    {data.role && (
                        <div className="text-xs text-muted-foreground leading-none">
                            {data.role}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="capitalize">{data.status || 'idle'}</span>
                </div>
            </div>
        </BaseNode>
    );
}
