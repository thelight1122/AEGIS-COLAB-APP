import { useState, useEffect } from 'react';
import {
    Users, Plus, Pencil, Trash2,
    BarChart3,
    User, Bot, Save, Globe, Shield, FolderHeart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { loadPeers, savePeers, addPeer, updatePeer, deletePeer } from '../core/peers/peerRegistryStore';
import { type PeerProfile, type PeerType, type LLMProvider, type TeamPreset } from '../core/peers/types';
import { PERSONA_TEMPLATES } from '../core/peers/personaStore';
import { loadTeamPresets, saveTeamPresets, createPresetFromPeers, deletePreset } from '../core/peers/teamPresetStore';
import { loadActiveTeam, togglePeerSelected, clearActiveTeam, type ActiveTeamState } from '../core/peers/activeTeamStore';
import { HUMAN_PEER } from '../core/peers/humanPeer';
import { useKeyring } from '../contexts/KeyringContext';
import { getProviderReadiness } from '../core/providers/providerReadiness';
import { useNavigate } from 'react-router-dom';
import { useProviderStatus } from '../contexts/ProviderStatusContext';
export default function TeamSetup() {
    const [peers, setPeers] = useState<PeerProfile[]>(() => loadPeers());
    const [presets, setPresets] = useState<TeamPreset[]>(() => loadTeamPresets());
    const [activeTeam, setActiveTeam] = useState<ActiveTeamState>(() => loadActiveTeam());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPresetPickerOpen, setIsPresetPickerOpen] = useState(false);
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

    const handleClearTeam = () => {
        setActiveTeam(clearActiveTeam());
    };

    const handleToggleActive = (peerId: string) => {
        setActiveTeam(prev => togglePeerSelected(prev, peerId));
    };

    const handleSaveTeamAsPreset = () => {
        const name = prompt("Enter a name for this team preset:");
        if (!name) return;

        const newPreset = createPresetFromPeers(name, peers);
        const nextPresets = [...presets, newPreset];
        setPresets(nextPresets);
        saveTeamPresets(nextPresets);
    };

    const handleLoadPreset = (preset: TeamPreset) => {
        // When loading a preset, we update the peer registry.
        // If a peer from the preset exists (by ID), we update it.
        // If it doesn't exist, we add it.
        // And we set the enabled states.

        const nextPeers = [...peers];

        preset.peers.forEach(pp => {
            const existingIdx = nextPeers.findIndex(p => p.id === pp.peerId);
            if (existingIdx >= 0) {
                nextPeers[existingIdx] = {
                    ...nextPeers[existingIdx],
                    enabled: pp.enabled,
                    provider: pp.provider || nextPeers[existingIdx].provider,
                    model: pp.model || nextPeers[existingIdx].model,
                    personaId: pp.personaTemplateId || nextPeers[existingIdx].personaId
                };
            } else {
                // If it doesn't exist, create it (best effort)
                nextPeers.push({
                    id: pp.peerId,
                    handle: pp.handle,
                    name: pp.handle.replace('@', ''),
                    type: pp.kind,
                    provider: pp.provider || 'lmstudio',
                    model: pp.model || '',
                    enabled: pp.enabled,
                    domains: [],
                    personaId: pp.personaTemplateId
                });
            }
        });

        setPeers(nextPeers);
        setIsPresetPickerOpen(false);
    };

    const handleDeletePreset = (id: string) => {
        if (confirm("Delete this preset?")) {
            const next = deletePreset(presets, id);
            setPresets(next);
            saveTeamPresets(next);
        }
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
                <div className="flex items-center gap-2">
                    {activeTeam.selectedPeerIds.length > 0 && (
                        <Button variant="destructive" onClick={handleClearTeam} className="gap-2 mr-2">
                            <Trash2 className="w-4 h-4" /> Clear Team
                        </Button>
                    )}
                    {presets.length > 0 && (
                        <Button variant="outline" onClick={() => setIsPresetPickerOpen(true)} className="gap-2">
                            <FolderHeart className="w-4 h-4" /> Use Saved Team
                        </Button>
                    )}
                    {peers.length > 0 && (
                        <Button variant="outline" onClick={handleSaveTeamAsPreset} className="gap-2">
                            <Save className="w-4 h-4" /> Save Team
                        </Button>
                    )}
                    <Button onClick={handleCreate} className="gap-2 ml-2">
                        <Plus className="w-4 h-4" /> Add Member
                    </Button>
                </div>
            </div>

            {presets.length > 0 && !isPresetPickerOpen && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <span className="font-bold">{presets.length} saved teams available.</span>
                            <p className="text-muted-foreground text-xs mt-0.5">Quickly swap between specialized coalitions.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIsPresetPickerOpen(true)} className="text-primary hover:text-primary hover:bg-primary/10">
                        View Presets
                    </Button>
                </div>
            )}

            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Current Team
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Human participant is always present. AI peers join only when selected.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <PeerCard
                            peer={HUMAN_PEER}
                            isActive={true}
                            onToggle={() => { }}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            readOnly={true}
                        />
                        {peers.filter(p => activeTeam.selectedPeerIds.includes(p.id)).map(peer => (
                            <PeerCard
                                key={peer.id}
                                peer={peer}
                                isActive={true}
                                onToggle={() => handleToggleActive(peer.id)}
                                onEdit={() => handleEdit(peer)}
                                onDelete={() => handleDeletePeer(peer.id)}
                            />
                        ))}
                        {activeTeam.selectedPeerIds.length === 0 && (
                            <div className="col-span-full py-8 text-center bg-muted/10 border-2 border-dashed border-border rounded-xl">
                                <p className="text-muted-foreground text-sm">No team members selected. Add them from the library.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                        <FolderHeart className="w-5 h-5" /> Peer Library
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {peers.filter(p => p.type !== 'human').map((peer) => (
                            <PeerCard
                                key={peer.id}
                                peer={peer}
                                isActive={activeTeam.selectedPeerIds.includes(peer.id)}
                                onToggle={() => handleToggleActive(peer.id)}
                                onEdit={() => handleEdit(peer)}
                                onDelete={() => handleDeletePeer(peer.id)}
                            />
                        ))}
                        {peers.filter(p => p.type !== 'human').length === 0 && (
                            <div className="col-span-full py-12 text-center bg-muted/20 border-2 border-dashed border-border rounded-xl">
                                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                                <h3 className="text-lg font-semibold">No Team Members Yet</h3>
                                <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                                    Start by adding human or AI participants to your registry.
                                </p>
                                <Button onClick={handleCreate} variant="outline" className="mt-4 gap-2">
                                    <Plus className="w-4 h-4" /> Add First Member
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog
                isOpen={isPresetPickerOpen}
                onClose={() => setIsPresetPickerOpen(false)}
                title="Use Saved Team"
            >
                <div className="space-y-4 py-2">
                    {presets.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors">
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {p.name}
                                    <span className="text-[10px] font-normal px-1.5 py-0.5 bg-muted rounded uppercase tracking-wider">
                                        {p.peers.length} Members
                                    </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-tighter">
                                    {p.peers.map(pp => pp.handle).join(', ')}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => handleLoadPreset(p)}>
                                    Load
                                </Button>
                                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeletePreset(p.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {presets.length === 0 && (
                        <p className="text-center text-muted-foreground py-4 italic">No presets saved.</p>
                    )}
                </div>
            </Dialog>

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
                                <option value="anthropic">Anthropic</option>
                                <option value="xai">xAI (Grok)</option>
                                <option value="lmstudio">Local (LM Studio)</option>
                                <option value="ollama">Local (Ollama)</option>
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

                    {(formData.provider === 'lmstudio' || formData.provider === 'ollama') && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500" /> Base URL
                            </label>
                            <input
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2 text-sm outline-none font-mono"
                                value={formData.baseURL || ''}
                                onChange={e => setFormData({ ...formData, baseURL: e.target.value })}
                                placeholder={formData.provider === 'lmstudio' ? "http://localhost:1234/v1" : "http://localhost:11434/v1"}
                            />
                        </div>
                    )}

                    <div className="space-y-2 mt-4">
                        <div className="p-3 bg-muted/30 border border-border rounded-lg flex items-start gap-2 text-sm">
                            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                                Provider keys are managed in <span className="font-semibold text-foreground">Settings (encrypted vault)</span>.
                            </p>
                        </div>
                    </div>
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

function PeerCard({ peer, isActive, onToggle, onEdit, onDelete, readOnly }: {
    peer: PeerProfile,
    isActive: boolean,
    onToggle: () => void,
    onEdit: () => void,
    onDelete: () => void,
    readOnly?: boolean
}) {
    const navigate = useNavigate();
    const { status: keyringState, hasEncryptedKey } = useKeyring();
    const { providerHealth, probeLocalProvider } = useProviderStatus();

    useEffect(() => {
        if (peer.type === 'ai' && peer.baseURL && (peer.provider === 'lmstudio' || peer.provider === 'ollama')) {
            probeLocalProvider(peer.baseURL).catch(() => { });
        }
    }, [peer, probeLocalProvider]);

    const health = peer.baseURL ? providerHealth[peer.baseURL] : undefined;

    const readiness = peer.type === 'ai'
        ? getProviderReadiness({
            provider: peer.provider,
            keyringState,
            hasEncryptedKey,
            baseURL: peer.baseURL,
            model: peer.model,
            health
        })
        : { state: 'ready' as const };

    const isReady = readiness.state === 'ready';

    return (
        <div
            className={cn(
                "group relative p-5 border rounded-xl transition-all hover:shadow-lg",
                !readOnly && (!isActive ? "opacity-60 grayscale bg-muted/20" : "bg-card border-primary shadow-sm bg-primary/5"),
                !isReady && "border-yellow-500/30 bg-muted/20",
                readOnly && "bg-primary/5 border-primary shadow-sm"
            )}
        >
            {!readOnly && (
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant={isActive ? "outline" : "default"}
                        size="sm"
                        className="h-7 text-xs px-2 shadow-sm"
                        onClick={onToggle}
                        disabled={!isActive && (!isReady || !peer.enabled)}
                    >
                        {isActive ? 'In Team' : 'Add to Team'}
                    </Button>
                </div>
            )}

            <div className="flex items-start justify-between mb-4 mt-2">
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
            </div>

            {!readOnly && (
                <div className="flex gap-2 justify-end mb-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        title="Edit Peer"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Peer"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {peer.type === 'ai' && peer.personaId && (
                <div className="mt-2 text-sm bg-muted/50 p-2.5 rounded-lg border border-border/50">
                    <div className="font-semibold flex items-center gap-2 mb-1 text-[10px] uppercase text-muted-foreground">
                        <BarChart3 className="w-3 h-3" /> Persona
                    </div>
                    <div className="text-xs font-medium">
                        {PERSONA_TEMPLATES.find(p => p.id === peer.personaId)?.name || 'Custom Persona'}
                    </div>
                </div>
            )}

            {peer.type === 'ai' && !isReady && (
                <div className="mt-3 flex items-center justify-between gap-2 bg-yellow-500/10 p-2.5 rounded-lg border border-yellow-500/20">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-yellow-600">
                            {readiness.state === 'locked' ? 'Locked' : 'Missing Config/Key'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{readiness.reason}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/20"
                        onClick={() => navigate('/settings')}
                    >
                        {readiness.state === 'locked' ? 'Unlock' : 'Go to Settings'}
                    </Button>
                </div>
            )}

            {peer.notes && (
                <p className="mt-3 text-sm text-muted-foreground italic line-clamp-2">
                    "{peer.notes}"
                </p>
            )}

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
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
    );
}
