import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface ToolCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    status: 'LIVE' | 'OFFLINE' | 'DIAGNOSTIC' | 'DEV';
    isActive?: boolean;
    onClick?: () => void;
}

const statusColors = {
    LIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
    OFFLINE: 'bg-muted/50 text-muted-foreground border-border',
    DIAGNOSTIC: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    DEV: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export function ToolCard({ title, description, icon, status, isActive, onClick }: ToolCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-4 rounded-xl border text-left transition-all duration-200 group flex gap-4",
                isActive
                    ? "bg-primary/5 border-primary shadow-lg ring-1 ring-primary/20"
                    : "bg-card hover:bg-muted/30 border-border hover:border-primary/40"
            )}
        >
            <div className={cn(
                "p-3 rounded-lg flex-shrink-0 transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{title}</h4>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold", statusColors[status])}>
                        {status}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
        </button>
    );
}
