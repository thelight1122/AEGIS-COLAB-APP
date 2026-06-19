import { ToolCard } from './ToolCard';
import { Cpu, Activity, Wrench } from 'lucide-react';

interface Tool {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    status: 'LIVE' | 'OFFLINE' | 'DIAGNOSTIC' | 'DEV';
}

const TOOLS: Tool[] = [
    {
        id: 'buildmaster',
        title: 'Buildmaster Agent',
        description: 'Sovereign Agent Runner Workshop from the AEGIS Kernel.',
        icon: <Wrench className="w-5 h-5" />,
        status: 'DEV',
    },
    {
        id: 'simulator',
        title: 'AI Simulator',
        description: 'Mock-parity LLM peer simulation with offline rolepacks.',
        icon: <Cpu className="w-5 h-5" />,
        status: 'OFFLINE', // User wanted OFFLINE, DEV
    },
    {
        id: 'gateway',
        title: 'Gateway Status',
        description: 'Real-time connectivity diagnostics for the governed tool conduit.',
        icon: <Activity className="w-5 h-5" />,
        status: 'LIVE', // User wanted LIVE, DIAGNOSTIC
    }
];

interface ToolListProps {
    activeToolId: string | null;
    onSelectTool: (id: string) => void;
}

export function ToolList({ activeToolId, onSelectTool }: ToolListProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 py-2">
                Available Tools
            </h3>
            <div className="space-y-3">
                {TOOLS.map((tool) => (
                    <ToolCard
                        key={tool.id}
                        {...tool}
                        isActive={activeToolId === tool.id}
                        onClick={() => onSelectTool(tool.id)}
                    />
                ))}
            </div>
        </div>
    );
}
