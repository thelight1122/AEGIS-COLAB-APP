import { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';


type NodeType = 'proposal' | 'tension' | 'scenario' | 'boundary';

interface CreateNodeData {
    label: string;
    type: NodeType;
    description?: string;
    author?: string;
    intensity?: 'low' | 'medium' | 'high';
    active?: boolean;
}

interface CreateNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateNode: (nodeData: CreateNodeData) => void;
}

export function CreateNodeModal({ isOpen, onClose, onCreateNode }: CreateNodeModalProps) {
    const [label, setLabel] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<NodeType>('proposal');
    const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const nodeData: CreateNodeData = {
            label,
            type,
        };

        if (type === 'proposal' || type === 'tension') {
            nodeData.description = description;
        }

        if (type === 'tension') {
            nodeData.intensity = intensity;
        }

        if (type === 'proposal') {
            nodeData.author = 'User'; // Placeholder
        }

        if (type === 'scenario') {
            nodeData.active = false;
        }

        onCreateNode(nodeData);
        resetForm();
    };

    const resetForm = () => {
        setLabel('');
        setDescription('');
        setType('proposal');
        setIntensity('medium');
        onClose();
    };

    return (
        <Dialog isOpen={isOpen} onClose={resetForm} title="Create New Node">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <div className="flex flex-wrap gap-2">
                        {(['proposal', 'tension', 'scenario', 'boundary'] as NodeType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`px-3 py-1 rounded-full text-sm border capitalize ${type === t
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="label" className="text-sm font-medium">Label</label>
                    <input
                        id="label"
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Enter node label..."
                        required
                    />
                </div>

                {(type === 'proposal' || type === 'tension') && (
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">Description</label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add generic details..."
                            className="min-h-[80px]"
                        />
                    </div>
                )}

                {type === 'tension' && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Intensity</label>
                        <div className="flex gap-2">
                            {(['low', 'medium', 'high'] as const).map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setIntensity(level)}
                                    className={`px-3 py-1 rounded-md text-xs border capitalize flex-1 ${intensity === level
                                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                                        : 'bg-transparent border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                    <Button type="submit">Create Node</Button>
                </div>
            </form>
        </Dialog>
    );
}
