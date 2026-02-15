import { useState } from 'react';
import {
    Eye, Plus, Pencil, Trash2, Power, PowerOff,
    ArrowUp, ArrowDown, ChevronRight, Save, X, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';

interface Lens {
    id: string;
    name: string;
    charter: string;
    invocationRule: 'auto' | 'manual' | 'on-demand';
    active: boolean;
    priority: number;
    color: string;
    domains: string[];
}

const COLORS = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500',
];

const defaultLenses: Lens[] = [
    { id: 'l1', name: 'Product', charter: 'Evaluate from a product-market fit perspective. Consider user needs, business viability, and competitive landscape.', invocationRule: 'auto', active: true, priority: 1, color: 'bg-blue-500', domains: ['Product'] },
    { id: 'l2', name: 'Engineering', charter: 'Assess technical feasibility, architecture impact, scalability, and maintainability of proposed changes.', invocationRule: 'auto', active: true, priority: 2, color: 'bg-green-500', domains: ['Engineering', 'Operational Layer'] },
    { id: 'l3', name: 'Design', charter: 'Review usability, accessibility, visual consistency, and user experience flow.', invocationRule: 'auto', active: true, priority: 3, color: 'bg-purple-500', domains: ['Design'] },
    { id: 'l4', name: 'Security', charter: 'Identify security vulnerabilities, compliance requirements, and data protection concerns.', invocationRule: 'manual', active: false, priority: 4, color: 'bg-red-500', domains: ['Security'] },
    { id: 'l5', name: 'Legal', charter: 'Evaluate regulatory, licensing, and intellectual property implications.', invocationRule: 'on-demand', active: false, priority: 5, color: 'bg-orange-500', domains: ['Legal'] },
];

const ruleLabels: Record<Lens['invocationRule'], string> = {
    auto: 'Auto-invoke',
    manual: 'Manual',
    'on-demand': 'On-demand',
};

const ruleColors: Record<Lens['invocationRule'], string> = {
    auto: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30',
    manual: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30',
    'on-demand': 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};

export default function Lenses() {
    const [lenses, setLenses] = useState<Lens[]>(defaultLenses);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLens, setEditingLens] = useState<Lens | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const sorted = [...lenses].sort((a, b) => a.priority - b.priority);

    const toggleActive = (id: string) => {
        setLenses((prev) => prev.map((l) => l.id === id ? { ...l, active: !l.active } : l));
    };

    const movePriority = (id: string, direction: 'up' | 'down') => {
        setLenses((prev) => {
            const s = [...prev].sort((a, b) => a.priority - b.priority);
            const idx = s.findIndex((l) => l.id === id);
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= s.length) return prev;
            const temp = s[idx].priority;
            s[idx] = { ...s[idx], priority: s[swapIdx].priority };
            s[swapIdx] = { ...s[swapIdx], priority: temp };
            return s;
        });
    };

    const openCreate = () => { setEditingLens(null); setIsFormOpen(true); };
    const openEdit = (lens: Lens) => { setEditingLens(lens); setIsFormOpen(true); };

    const handleSave = (data: Omit<Lens, 'id' | 'priority'>) => {
        if (editingLens) {
            setLenses((prev) => prev.map((l) => l.id === editingLens.id ? { ...l, ...data } : l));
        } else {
            const maxPriority = Math.max(0, ...lenses.map((l) => l.priority));
            setLenses((prev) => [...prev, { ...data, id: `l-${Date.now()}`, priority: maxPriority + 1 }]);
        }
        setIsFormOpen(false);
    };

    const handleDelete = (id: string) => {
        setLenses((prev) => prev.filter((l) => l.id !== id));
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Eye className="w-6 h-6" />
                        Lenses Configuration
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Configure cognitive lenses, charters, and invocation rules.
                    </p>
                </div>
                <Button size="sm" onClick={openCreate} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Lens
                </Button>
            </div>

            {/* Summary Bar */}
            <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{lenses.filter((l) => l.active).length} active</span>
                <span>{lenses.filter((l) => !l.active).length} inactive</span>
                <span>{lenses.filter((l) => l.invocationRule === 'auto').length} auto-invoke</span>
            </div>

            {/* Lens List */}
            <div className="space-y-2">
                {sorted.map((lens, idx) => (
                    <div
                        key={lens.id}
                        className={cn(
                            "border rounded-lg bg-card transition-all",
                            lens.active ? "border-border" : "border-border/50 opacity-60",
                            expandedId === lens.id ? "shadow-md" : "hover:shadow-sm"
                        )}
                    >
                        {/* Row Header */}
                        <div className="flex items-center gap-3 p-4">
                            {/* Priority Controls */}
                            <div className="flex flex-col gap-0.5">
                                <button
                                    onClick={() => movePriority(lens.id, 'up')}
                                    disabled={idx === 0}
                                    className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                                    aria-label="Move lens up"
                                    title="Move up"
                                >
                                    <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => movePriority(lens.id, 'down')}
                                    disabled={idx === sorted.length - 1}
                                    className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors"
                                    aria-label="Move lens down"
                                    title="Move down"
                                >
                                    <ArrowDown className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Color Dot + Name */}
                            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", lens.color)} />
                            <button
                                onClick={() => setExpandedId(expandedId === lens.id ? null : lens.id)}
                                className="flex-1 text-left flex items-center gap-2"
                            >
                                <span className="font-semibold text-sm">{lens.name}</span>
                                <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expandedId === lens.id && "rotate-90")} />
                            </button>

                            {/* Badges */}
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border capitalize", ruleColors[lens.invocationRule])}>
                                {ruleLabels[lens.invocationRule]}
                            </span>

                            {/* Actions */}
                            <button
                                onClick={() => toggleActive(lens.id)}
                                className={cn("p-1.5 rounded-md transition-colors", lens.active ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted")}
                                title={lens.active ? 'Deactivate' : 'Activate'}
                            >
                                {lens.active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                            </button>
                            <button onClick={() => openEdit(lens)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Edit lens" title="Edit lens">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(lens.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label="Delete lens" title="Delete lens">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Expanded Charter */}
                        {expandedId === lens.id && (
                            <div className="px-4 pb-4 pt-0 border-t border-border ml-10">
                                <div className="mt-3 space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Charter
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{lens.charter}</p>
                                </div>
                                {/* Domain Tags */}
                                {lens.domains.length > 0 && (
                                    <div className="mt-4 border-t border-border/50 pt-3">
                                        <div className="flex flex-wrap gap-1">
                                            {lens.domains.map((d) => (
                                                <span key={d} className="text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {lenses.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No lenses configured. Add one to get started.</p>
            )}

            {/* Lens Form Dialog */}
            <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingLens ? 'Edit Lens' : 'Add Lens'}>
                <LensForm
                    initial={editingLens}
                    onSave={handleSave}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Dialog>
        </div>
    );
}

// --- Lens Form ---
interface LensFormProps {
    initial: Lens | null;
    onSave: (data: Omit<Lens, 'id' | 'priority'>) => void;
    onCancel: () => void;
}

function LensForm({ initial, onSave, onCancel }: LensFormProps) {
    const [name, setName] = useState(initial?.name || '');
    const [charter, setCharter] = useState(initial?.charter || '');
    const [invocationRule, setInvocationRule] = useState<Lens['invocationRule']>(initial?.invocationRule || 'manual');
    const [active, setActive] = useState(initial?.active ?? true);
    const [color, setColor] = useState(initial?.color || COLORS[0]);
    const [domainsInput, setDomainsInput] = useState(initial?.domains.join(', ') || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const domains = domainsInput.split(',').map(d => d.trim()).filter(Boolean);
        onSave({ name: name.trim(), charter: charter.trim(), invocationRule, active, color, domains });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Name</label>
                <input
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Security"
                    required
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Charter</label>
                <textarea
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
                    value={charter}
                    onChange={(e) => setCharter(e.target.value)}
                    placeholder="Describe what this lens evaluates..."
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Domain Tags (comma separated)</label>
                <input
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={domainsInput}
                    onChange={(e) => setDomainsInput(e.target.value)}
                    placeholder="e.g. Engineering, Product, Security"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Invocation Rule</label>
                    <select
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={invocationRule}
                        onChange={(e) => setInvocationRule(e.target.value as Lens['invocationRule'])}
                    >
                        <option value="auto">Auto-invoke</option>
                        <option value="manual">Manual</option>
                        <option value="on-demand">On-demand</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
                    <select
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={active ? 'active' : 'inactive'}
                        onChange={(e) => setActive(e.target.value === 'active')}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Color</label>
                <div className="flex gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={cn(
                                "w-6 h-6 rounded-full transition-all",
                                c,
                                color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-60 hover:opacity-100"
                            )}
                        />
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
                    <X className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="w-3.5 h-3.5" /> Save
                </Button>
            </div>
        </form>
    );
}
