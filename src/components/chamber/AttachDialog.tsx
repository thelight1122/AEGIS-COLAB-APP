import { Dialog } from '../ui/dialog';
import { Link } from 'lucide-react';

interface NodeOption {
    id: string;
    label: string;
    type: string;
}

interface AttachDialogProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: NodeOption[];
    onAttach: (nodeId: string) => void;
}

export function AttachDialog({ isOpen, onClose, nodes, onAttach }: AttachDialogProps) {
    const typeColors: Record<string, string> = {
        proposal: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
        tension: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
        scenario: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
        boundary: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Attach to Node">
            <p className="text-sm text-muted-foreground mb-4">
                Select a canvas node to link this IDS card to.
            </p>
            {nodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No nodes on the canvas yet.</p>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {nodes.map((node) => (
                        <button
                            key={node.id}
                            onClick={() => {
                                onAttach(node.id);
                                onClose();
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left group"
                        >
                            <Link className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{node.label}</div>
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] font-medium uppercase rounded-full border ${typeColors[node.type] || 'bg-muted text-muted-foreground'}`}>
                                {node.type}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </Dialog>
    );
}
