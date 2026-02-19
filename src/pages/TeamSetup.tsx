import { useState, useEffect } from 'react';
import {
    Users, Plus, Pencil, Trash2,
    BarChart3,
    User, Bot, Save, Globe
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { loadPeers, savePeers, addPeer, updatePeer, deletePeer } from '../core/peers/peerRegistryStore';
import { type PeerProfile, type PeerType, type LLMProvider } from '../core/peers/types';
import { PERSONA_TEMPLATES } from '../core/peers/personaStore';

export default function TeamSetup() {
    const [peers, setPeers] = useState<PeerProfile[]>(() => loadPeers());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPeer, setEditingPeer] = useState<PeerProfile | null>(null);

    // Persist on change
    useEffect(() => {
        savePeers(peers);
    }, [peers]);

    const handleCreate = () => {
        setEditingPeer(null);
        setIsFormOpen(true);
    };

    const handleEdit = (peer: PeerProfile) => {
        setEditingPeer(peer);
        setIsFormOpen(true);
    };

    const handleDeletePeer = (id: string) => {
        if (confirm("Are you sure you want to delete this peer?")) {
            setPeers(prev => deletePeer(prev, id));
        }
    };

    const handleSave = (data: Omit<PeerProfile, 'id'>) => {
        if (editingPeer) {
            setPeers(prev => updatePeer(prev, editingPeer.id, data));
        } else {
            setPeers(prev => addPeer(prev, data));
        }
        setIsFormOpen(false);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Team Setup
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Configure your coalition of human and AI peers.
                    </p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Member
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {peers.map((peer) => (
                    <div
                        key={peer.id}
                        className={cn(
                            "group relative p-5 bg-card border rounded-xl transition-all hover:shadow-lg",
                            !peer.enabled && "opacity-60 grayscale"
                        )}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-3 rounded-full",
                                    peer.type === 'ai' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                )}>
                                    {peer.type === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{peer.handle}</div>
                                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        {peer.type === 'ai' ? `${peer.provider} / ${peer.model}` : 'Human Participant'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(peer)}
                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                                    title="Edit Peer"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeletePeer(peer.id)}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete Peer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {peer.type === 'ai' && peer.personaId && (
                            <div className="mt-2 text-sm bg-muted/50 p-3 rounded-lg border border-border/50">
                                <div className="font-semibold flex items-center gap-2 mb-1 text-xs uppercase text-muted-foreground">
                                    <BarChart3 className="w-3 h-3" /> Persona Template
                                </div>
                                <div className="text-sm font-medium">
                                    {PERSONA_TEMPLATES.find(p => p.id === peer.personaId)?.name || 'Custom Persona'}
                                </div>
                            </div>
                        )}

                        {peer.notes && (
                            <p className="mt-3 text-sm text-muted-foreground italic line-clamp-2">
                                "{peer.notes}"
                            </p>
                        )}

                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <span className={cn(
                                "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                peer.enabled ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground border-border"
                            )}>
                                {peer.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            {peer.baseURL && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> {new URL(peer.baseURL).hostname}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {peers.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-muted/20 border-2 border-dashed border-border rounded-xl">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-semibold">No Team Members Yet</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                            Start by adding human or AI participants to your collaboration group.
                        </p>
                        <Button onClick={handleCreate} variant="outline" className="mt-4 gap-2">
                            <Plus className="w-4 h-4" /> Add First Member
                        </Button>
                    </div>
                )}
            </div>

            <Dialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingPeer ? 'Edit Member' : 'Add New Member'}
            >
                <PeerProfileForm
                    initial={editingPeer || {
                        handle: '',
                        name: '',
                        type: 'ai',
                        provider: 'gemini',
                        model: 'gemini-1.5-pro',
                        enabled: true,
                        domains: [],
                        notes: ''
                    }}
                    onSave={handleSave}
                    onCancel={() => setIsFormOpen(false)}
                />
            </Dialog>
        </div>
    );
}

function PeerProfileForm({ initial, onSave, onCancel }: {
    initial: PeerProfile | Omit<PeerProfile, 'id'>,
    onSave: (data: Omit<PeerProfile, 'id'>) => void,
    onCancel: () => void
}) {
    const [formData, setFormData] = useState(initial);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Handle</label>
                    <input
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={formData.handle}
                        onChange={e => setFormData({ ...formData, handle: e.target.value, name: formData.name || e.target.value })}
                        placeholder="@atlas"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Display Name</label>
                    <input
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Atlas (AI)"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Type</label>
                    <div className="flex bg-muted/50 rounded-lg p-1 border border-border">
                        {(['ai', 'human'] as PeerType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setFormData({ ...formData, type: t })}
                                className={cn(
                                    "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                                    formData.type === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold">Domains (comma separated)</label>
                    <input
                        className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm outline-none"
                        value={formData.domains.join(', ')}
                        onChange={e => setFormData({ ...formData, domains: e.target.value.split(',').map(d => d.trim()).filter(Boolean) })}
                        placeholder="Engineering, Security"
                    />
                </div>
            </div>

            {formData.type === 'ai' && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Provider</label>
                            <select
                                title="LLM Provider"
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm outline-none"
                                value={formData.provider}
                                onChange={e => setFormData({ ...formData, provider: e.target.value as LLMProvider })}
                            >
                                <option value="gemini">Gemini</option>
                                <option value="openai">OpenAI</option>
                                <option value="xai">xAI (Grok)</option>
                                <option value="local">Local (LM Studio)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Model</label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm outline-none"
                                value={formData.model}
                                onChange={e => setFormData({ ...formData, model: e.target.value })}
                                placeholder="gemini-1.5-pro"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-primary/80 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Persona Template
                        </label>
                        <select
                            title="Persona Template"
                            className="w-full bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 text-sm outline-none"
                            value={formData.personaId || ''}
                            onChange={e => setFormData({ ...formData, personaId: e.target.value || undefined })}
                        >
                            <option value="">No Template (Default)</option>
                            {PERSONA_TEMPLATES.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {formData.provider === 'local' && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500" /> Base URL
                            </label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm outline-none font-mono"
                                value={formData.baseURL || ''}
                                onChange={e => setFormData({ ...formData, baseURL: e.target.value })}
                                placeholder="http://localhost:1234/v1"
                            />
                        </div>
                    )}
                </>
            )}

            <div className="space-y-2">
                <label className="text-sm font-semibold">Notes / Description</label>
                <textarea
                    className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm outline-none resize-none"
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Describe this team member's role or focus area..."
                    rows={3}
                />
            </div>

            <div className="flex items-center gap-3 py-2">
                <input
                    type="checkbox"
                    id="is-enabled"
                    checked={formData.enabled}
                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="is-enabled" className="text-sm font-medium">Enable this team member</label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" className="gap-2">
                    <Save className="w-4 h-4" /> Save Member
                </Button>
            </div>
        </form>
    );
}
