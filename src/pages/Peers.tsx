import { useState, useEffect, useRef } from 'react';
import {
    Users, Plus, Pencil, Trash2, Download, Upload,
    User, Bot, Search, X, Save
} from 'lucide-react';
import { cn } from '../lib/utils';
import { type Peer, MOCK_PEERS } from '../types';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';

const STORAGE_KEY = 'aegis-peers-registry';

function loadPeers(): Peer[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return MOCK_PEERS.map((p) => ({ ...p }));
}

function savePeers(peers: Peer[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(peers));
}

const emptyPeer: Omit<Peer, 'id'> = {
    name: '',
    type: 'human',
    role: '',
    status: 'offline',
    acknowledged: false,
    domains: [],
};

export default function Peers() {
    const [peers, setPeers] = useState<Peer[]>(loadPeers);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingPeer, setEditingPeer] = useState<Peer | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Persist on change
    useEffect(() => { savePeers(peers); }, [peers]);

    const filtered = peers.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- CRUD ---
    const openCreate = () => {
        setEditingPeer(null);
        setIsFormOpen(true);
    };

    const openEdit = (peer: Peer) => {
        setEditingPeer(peer);
        setIsFormOpen(true);
    };

    const handleSave = (data: Omit<Peer, 'id'>) => {
        if (editingPeer) {
            setPeers((prev) => prev.map((p) => p.id === editingPeer.id ? { ...p, ...data } : p));
        } else {
            const newPeer: Peer = { ...data, id: `p-${Date.now()}` };
            setPeers((prev) => [...prev, newPeer]);
        }
        setIsFormOpen(false);
    };

    const handleDelete = (id: string) => {
        setPeers((prev) => prev.filter((p) => p.id !== id));
    };

    // --- Import / Export ---
    const handleExport = () => {
        const blob = new Blob([JSON.stringify(peers, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aegis-peers.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (Array.isArray(data)) {
                    setPeers(data);
                }
            } catch { /* ignore bad json */ }
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Peer Registry
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Manage human and AI peers, roles, and domains.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Import
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                    <Button size="sm" onClick={openCreate} className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add Peer
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search peers..."
                    aria-label="Search peers"
                    className="w-full bg-muted/50 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Peer Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((peer) => {
                    // Check API key configuration for AI peers
                    let apiStatus = null;
                    if (peer.type === 'ai') {
                        const settings = JSON.parse(localStorage.getItem('aegis-system-settings') || '{}');
                        const isConfigured = !!(settings.geminiKey || settings.openaiKey || settings.grokKey || settings.lmStudioKey);
                        apiStatus = (
                            <div className={cn(
                                "mt-2 px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tight border flex items-center gap-1.5",
                                isConfigured
                                    ? "bg-green-500/5 text-green-600 border-green-500/20"
                                    : "bg-red-500/5 text-red-600 border-red-500/20"
                            )}>
                                {isConfigured ? (
                                    <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        API Configured
                                    </>
                                ) : (
                                    <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        API Key Required
                                    </>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={peer.id}
                            className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all group overflow-hidden relative"
                        >
                            {/* Glow element for configured AI peers */}
                            {peer.type === 'ai' && (
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full -mr-12 -mt-12 pointer-events-none" />
                            )}

                            <div className="flex items-start justify-between mb-3 relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        peer.type === 'ai' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                    )}>
                                        {peer.type === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{peer.name}</div>
                                        <div className="text-xs text-muted-foreground">{peer.role}</div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEdit(peer)}
                                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label="Edit peer"
                                        title="Edit peer"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(peer.id)}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        aria-label="Delete peer"
                                        title="Delete peer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs relative z-10">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full border capitalize",
                                    peer.status === 'online' ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30"
                                        : peer.status === 'busy' ? "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                                            : "text-muted-foreground bg-muted/50 border-border"
                                )}>
                                    {peer.status}
                                </span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full capitalize",
                                    peer.type === 'ai' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                )}>
                                    {peer.type}
                                </span>
                                {peer.matchScore !== undefined && (
                                    <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        {peer.matchScore}%
                                    </span>
                                )}
                            </div>

                            {/* Domain Tags */}
                            {peer.domains.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1 relative z-10">
                                    {peer.domains.map((d) => (
                                        <span key={d} className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {apiStatus}
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No peers found.</p>
            )}

            {/* Peer Form Dialog */}
            <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingPeer ? 'Edit Peer' : 'Add Peer'}>
                <PeerForm
                    initial={editingPeer || emptyPeer}
                    onSave={handleSave}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Dialog>
        </div>
    );
}

// --- Peer Form Component ---
interface PeerFormProps {
    initial: Omit<Peer, 'id'> | Peer;
    onSave: (data: Omit<Peer, 'id'>) => void;
    onCancel: () => void;
}

function PeerForm({ initial, onSave, onCancel }: PeerFormProps) {
    const [name, setName] = useState(initial.name);
    const [type, setType] = useState<Peer['type']>(initial.type);
    const [role, setRole] = useState(initial.role);
    const [status, setStatus] = useState<Peer['status']>(initial.status);
    const [matchScore, setMatchScore] = useState<number | undefined>(initial.matchScore);
    const [domainsInput, setDomainsInput] = useState(initial.domains.join(', '));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !role.trim()) return;
        const domains = domainsInput.split(',').map(d => d.trim()).filter(Boolean);
        onSave({ name: name.trim(), type, role: role.trim(), status, matchScore, acknowledged: false, domains });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Name</label>
                <input
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Atlas (AI)"
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Type</label>
                    <select
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={type}
                        onChange={(e) => setType(e.target.value as Peer['type'])}
                    >
                        <option value="human">Human</option>
                        <option value="ai">AI</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
                    <select
                        className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as Peer['status'])}
                    >
                        <option value="online">Online</option>
                        <option value="busy">Busy</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Role / Domain</label>
                <input
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Systems Lens"
                    required
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase">Match Score (optional)</label>
                <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={matchScore ?? ''}
                    onChange={(e) => setMatchScore(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="0-100"
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
