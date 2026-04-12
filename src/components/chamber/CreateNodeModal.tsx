import { useState } from 'react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';


type NodeType = 'proposal' | 'tension' | 'scenario' | 'boundary' | 'image' | 'agent' | 'decision';

const AGENT_ROLES = ['Architect', 'Reviewer', 'Strategist', 'Mediator', 'Observer', 'Custom'];

export interface CreateNodeData {
    label: string;
    type: NodeType;
    description?: string;
    author?: string;
    intensity?: 'low' | 'medium' | 'high';
    active?: boolean;
    imageUrl?: string;
    alt?: string;
    role?: string;
    status?: 'active' | 'idle' | 'offline';
    state?: 'approved' | 'denied' | 'pending';
    details?: string;
}

interface CreateNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateNode: (nodeData: CreateNodeData) => void;
    defaultType?: NodeType;
    initialData?: CreateNodeData;
    mode?: 'create' | 'edit';
}

export function CreateNodeModal({ isOpen, onClose, onCreateNode, defaultType, initialData, mode = 'create' }: CreateNodeModalProps) {
    const [label, setLabel] = useState(initialData?.label || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [type, setType] = useState<NodeType>(initialData?.type || defaultType || 'proposal');
    const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>(initialData?.intensity || 'medium');
    
    // New fields
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
    const [selectedRolePreset, setSelectedRolePreset] = useState(() => {
        if (!initialData?.role) return 'Architect';
        return AGENT_ROLES.includes(initialData.role) ? initialData.role : 'Custom';
    });
    const [customRole, setCustomRole] = useState(() => {
        if (!initialData?.role) return '';
        return AGENT_ROLES.includes(initialData.role) ? '' : initialData.role;
    });
    const [status, setStatus] = useState<'active' | 'idle' | 'offline'>(initialData?.status || 'idle');
    const [decisionState, setDecisionState] = useState<'approved' | 'denied' | 'pending'>(initialData?.state || 'pending');
    const [details, setDetails] = useState(initialData?.details || '');

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

        // New node integrations
        if (type === 'image') {
            nodeData.imageUrl = imageUrl;
        }

        if (type === 'agent') {
            nodeData.role = selectedRolePreset === 'Custom' ? customRole : selectedRolePreset;
            nodeData.status = status;
        }

        if (type === 'decision') {
            nodeData.state = decisionState;
            nodeData.details = details;
        }

        onCreateNode(nodeData);
        resetForm();
    };

    const resetForm = () => {
        setLabel('');
        setDescription('');
        setType('proposal');
        setIntensity('medium');
        setImageUrl('');
        setSelectedRolePreset('Architect');
        setCustomRole('');
        setStatus('idle');
        setDecisionState('pending');
        setDetails('');
        onClose();
    };

    const titleText = mode === 'edit' ? 'Update Node' : 'Create New Node';
    const submitText = mode === 'edit' ? 'Update' : 'Create';

    return (
        <Dialog isOpen={isOpen} onClose={resetForm} title={titleText}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <div className="flex flex-wrap gap-2">
                        {(['proposal', 'tension', 'scenario', 'boundary', 'image', 'agent', 'decision'] as NodeType[]).map((t) => (
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

                {type === 'image' && (
                    <div className="space-y-2">
                        <label htmlFor="imageUrl" className="text-sm font-medium">Image URL</label>
                        <input
                            id="imageUrl"
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="https://example.com/image.jpg (Optional)"
                        />
                    </div>
                )}

                {type === 'agent' && (
                    <>
                        <div className="space-y-2">
                            <label htmlFor="role-select" className="text-sm font-medium">Agent Role</label>
                            <select
                                id="role-select"
                                value={selectedRolePreset}
                                onChange={(e) => setSelectedRolePreset(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-slate-900 border-slate-700 text-white px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                                {AGENT_ROLES.map((r) => (
                                    <option key={r} value={r} className="bg-slate-900 text-white">
                                        {r}
                                    </option>
                                ))}
                            </select>

                            {selectedRolePreset === 'Custom' && (
                                <input
                                    id="role"
                                    type="text"
                                    value={customRole}
                                    onChange={(e) => setCustomRole(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors mt-2"
                                    placeholder="Enter custom role..."
                                    required
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <div className="flex gap-2">
                                {(['active', 'idle', 'offline'] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={`px-3 py-1 rounded-md text-xs border capitalize flex-1 ${status === s
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-transparent border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {type === 'decision' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Decision State</label>
                            <div className="flex gap-2">
                                {(['approved', 'denied', 'pending'] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setDecisionState(s)}
                                        className={`px-3 py-1 rounded-md text-xs border capitalize flex-1 ${decisionState === s
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-transparent border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="details" className="text-sm font-medium">Details</label>
                            <input
                                id="details"
                                type="text"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                placeholder="Add decision context..."
                            />
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                    <Button type="submit">{submitText}</Button>
                </div>
            </form>
        </Dialog>
    );
}
