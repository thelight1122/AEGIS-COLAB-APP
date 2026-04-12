import { Button } from '../ui/button';
import { 
    StickyNote, 
    Zap, 
    Map, 
    Square, 
    Image, 
    Bot, 
    GitBranch,
    type LucideIcon
} from 'lucide-react';

type NodeType = 'proposal' | 'tension' | 'scenario' | 'boundary' | 'image' | 'agent' | 'decision';

interface ToolbarItem {
    type: NodeType;
    icon: LucideIcon;
    label: string;
    description: string;
    color: string;
}

const items: ToolbarItem[] = [
    { type: 'proposal', icon: StickyNote, label: 'Proposal', description: 'Add a new proposal node', color: 'text-amber-500 bg-amber-500/10' },
    { type: 'tension', icon: Zap, label: 'Tension', description: 'Log a tension or blocker', color: 'text-rose-500 bg-rose-500/10' },
    { type: 'scenario', icon: Map, label: 'Scenario', description: 'Define context or scenario boundary', color: 'text-blue-500 bg-blue-500/10' },
    { type: 'boundary', icon: Square, label: 'Boundary', description: 'Mark scope limit frame', color: 'text-purple-500 bg-purple-500/10' },
    { type: 'image', icon: Image, label: 'Image', description: 'Insert image frame URL', color: 'text-emerald-500 bg-emerald-500/10' },
    { type: 'agent', icon: Bot, label: 'AI Peer', description: 'Represent an Agent frame', color: 'text-indigo-500 bg-indigo-500/10' },
    { type: 'decision', icon: GitBranch, label: 'Decision', description: 'Include branch decision gate', color: 'text-teal-500 bg-teal-500/10' },
];

interface WhiteboardToolbarProps {
    onSelectItem: (type: NodeType) => void;
}

export function WhiteboardToolbar({ onSelectItem }: WhiteboardToolbarProps) {
    return (
        <div className="flex flex-col gap-1.5 p-2 bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-xl">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <Button
                        key={item.type}
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 p-0 rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={() => onSelectItem(item.type)}
                        title={`${item.label} - ${item.description}`}
                    >
                        <div className={`p-1.5 rounded-md ${item.color}`}>
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                    </Button>
                );
            })}
        </div>
    );
}
