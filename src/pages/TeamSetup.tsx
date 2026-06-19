import { useState, useEffect, useRef } from 'react';
import {
    Users, Plus, Pencil, Trash2,
    BarChart3,
    User, Bot, Save, Globe, Shield, FolderHeart, FileText, Upload, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { loadPeers, savePeers, addPeer, updatePeer, deletePeer } from '../core/peers/peerRegistryStore';
import { type PeerProfile, type PeerType, type LLMProvider, type TeamPreset, type PeerContextFile } from '../core/peers/types';
import { PERSONA_TEMPLATES } from '../core/peers/personaStore';
import { loadTeamPresets, saveTeamPresets, createPresetFromPeers, deletePreset } from '../core/peers/teamPresetStore';
import { loadActiveTeam, togglePeerSelected, clearActiveTeam, setSelectedPeerIds, type ActiveTeamState } from '../core/peers/activeTeamStore';
import { HUMAN_PEER } from '../core/peers/humanPeer';
import { useKeyring } from '../contexts/KeyringContext';
import { getProviderReadiness } from '../core/providers/providerReadiness';
import { useNavigate } from 'react-router-dom';
import { useProviderStatus } from '../contexts/ProviderStatusContext';
import { normalizeLocalEndpoint } from '../core/providers/localEndpoint';
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
        const selectedPeers = peers.filter(p => activeTeam.selectedPeerIds.includes(p.id));
        if (selectedPeers.length === 0) return;

        const name = prompt("Enter a name for this team preset:");
        if (!name) return;

        const newPreset = createPresetFromPeers(name, selectedPeers);
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
                    personaId: pp.personaTemplateId || nextPeers[existingIdx].personaId,
                    classification: pp.classification ?? nextPeers[existingIdx].classification,
                    domains: pp.domains ?? nextPeers[existingIdx].domains,
                    baseURL: pp.baseURL ?? nextPeers[existingIdx].baseURL,
                    notes: pp.notes ?? nextPeers[existingIdx].notes,
                    systemPrompt: pp.systemPrompt ?? nextPeers[existingIdx].systemPrompt,
                    contextFiles: pp.contextFiles ?? nextPeers[existingIdx].contextFiles,
                    dataQuad: pp.dataQuad ?? nextPeers[existingIdx].dataQuad,
                    orientation: pp.orientation ?? nextPeers[existingIdx].orientation,
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
                    classification: pp.classification,
                    domains: pp.domains ?? [],
                    personaId: pp.personaTemplateId,
                    baseURL: pp.baseURL,
                    notes: pp.notes,
                    systemPrompt: pp.systemPrompt,
                    contextFiles: pp.contextFiles,
                    dataQuad: pp.dataQuad,
                    orientation: pp.orientation,
                });
            }
        });

        const selectedPeerIds = preset.peers.filter(pp => pp.enabled).map(pp => pp.peerId);
        const nextActiveTeam = setSelectedPeerIds(
            { ...activeTeam, loadedPresetId: preset.id },
            selectedPeerIds
        );

        setPeers(nextPeers);
        setActiveTeam(nextActiveTeam);
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
                        Commons Participant Set
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Configure your coalition of human and AI peers.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTeam.selectedPeerIds.length > 0 && (
                        <Button variant="destructive" onClick={handleClearTeam} className="gap-2 mr-2">
                            <Trash2 className="w-4 h-4" /> Clear Set
                        </Button>
                    )}
                    {presets.length > 0 && (
                        <Button variant="outline" onClick={() => setIsPresetPickerOpen(true)} className="gap-2">
                            <FolderHeart className="w-4 h-4" /> Use Saved Set
                        </Button>
                    )}
                    {activeTeam.selectedPeerIds.length > 0 && (
                        <Button variant="outline" onClick={handleSaveTeamAsPreset} className="gap-2">
                            <Save className="w-4 h-4" /> Save Set
                        </Button>
                    )}
                    <Button onClick={handleCreate} className="gap-2 ml-2">
                        <Plus className="w-4 h-4" /> Add Member
                    </Button>
                </div>
            </div>

            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <FolderHeart className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-[0.16em]">Saved Peer Sets</h3>
                            <p className="text-muted-foreground text-xs mt-0.5">
                                Load a preserved coalition into the active participant set.
                            </p>
                        </div>
                    </div>
                    {presets.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setIsPresetPickerOpen(true)} className="gap-2">
                            <FolderHeart className="w-4 h-4" /> Open Picker
                        </Button>
                    )}
                </div>

                {presets.length === 0 ? (
                    <div className="py-6 text-center bg-muted/10 border border-dashed border-border rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">No saved peer sets yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Select peers below, then use Save Set to preserve that coalition.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {presets.map(preset => {
                            const isLoaded = activeTeam.loadedPresetId === preset.id;
                            return (
                                <div
                                    key={preset.id}
                                    className={cn(
                                        "rounded-lg border p-4 bg-muted/20 space-y-3",
                                        isLoaded ? "border-primary bg-primary/5" : "border-border"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold flex items-center gap-2">
                                                <span className="truncate">{preset.name}</span>
                                                <span className="text-[10px] font-normal px-1.5 py-0.5 bg-muted rounded uppercase tracking-wider shrink-0">
                                                    {preset.peers.length} Peers
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-1 uppercase font-mono tracking-tighter truncate">
                                                {preset.peers.map(pp => pp.handle).join(', ')}
                                            </div>
                                        </div>
                                        {isLoaded && (
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-muted-foreground">
                                            Updated {new Date(preset.updatedAt).toLocaleDateString()}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" onClick={() => handleLoadPreset(preset)}>
                                                Load Set
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeletePreset(preset.id)}
                                                aria-label={`Delete ${preset.name}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Current Participant Set
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
                                <p className="text-muted-foreground text-sm">No participants selected. Add them from the library.</p>
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
                                <h3 className="text-lg font-semibold">No Participants Yet</h3>
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
                title="Use Saved Participant Set"
            >
                <div className="space-y-4 py-2">
                    {presets.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors">
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {p.name}
                                    <span className="text-[10px] font-normal px-1.5 py-0.5 bg-muted rounded uppercase tracking-wider">
                                        {p.peers.length} Participants
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = (formData.provider === 'lmstudio' || formData.provider === 'ollama')
            ? { ...formData, baseURL: normalizeLocalEndpoint(formData.baseURL) }
            : formData;
        onSave(normalized);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                const content = ev.target?.result as string;
                const newFile: PeerContextFile = { name: file.name, content };
                setFormData(prev => ({
                    ...prev,
                    contextFiles: [...(prev.contextFiles ?? []), newFile],
                }));
            };
            reader.readAsText(file);
        });
        e.target.value = '';
    };

    const triggerFileUpload = () => fileInputRef.current?.click();

    const removeContextFile = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            contextFiles: (prev.contextFiles ?? []).filter((_, i) => i !== idx),
        }));
    };

    const updateContextFileName = (idx: number, name: string) => {
        setFormData(prev => ({
            ...prev,
            contextFiles: (prev.contextFiles ?? []).map((f, i) => i === idx ? { ...f, name } : f),
        }));
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
                            <label className="text-sm font-semibold">Substrate Interface</label>
                            <select
                                title="Substrate Interface"
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
                            <label className="text-sm font-semibold">Runtime Model</label>
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
                                <Globe className="w-4 h-4 text-blue-500" /> Access Path URL
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
                                Runtime-interface access keys are managed in <span className="font-semibold text-foreground">Settings (encrypted vault)</span>.
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
                    placeholder="Describe this participant's role or focus area..."
                    rows={3}
                />
            </div>

            {/* System Prompt */}
            <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    System Prompt
                </label>
                <p className="text-xs text-muted-foreground">
                    Written after the AEGIS formation prompt. Use this to orient this peer to the project, give it context about who you are, or calibrate its stance before each session.
                </p>
                <textarea
                    className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm outline-none resize-y font-mono"
                    value={formData.systemPrompt || ''}
                    onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                    placeholder={`You are ${formData.handle || 'a peer'} in the AEGIS Commons. The Architect is Tracey Prutch...`}
                    rows={6}
                />
            </div>

            {/* Context Files */}
            <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold flex items-center gap-2">
                        <Upload className="w-4 h-4 text-primary" />
                        Context Files
                    </div>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".txt,.md,.json,.ts,.tsx,.js,.jsx,.csv,.yaml,.yml"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <button
                            type="button"
                            onClick={triggerFileUpload}
                            className="cursor-pointer inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
                        >
                            <Upload className="w-3 h-3" /> Upload File
                        </button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => setFormData(prev => ({
                                ...prev,
                                contextFiles: [...(prev.contextFiles ?? []), { name: 'New Document', content: '' }],
                            }))}
                        >
                            <Plus className="w-3 h-3" /> Paste
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Files are injected verbatim into this peer's context on every call. Paste AEGIS Canon, project briefs, or any reference material you want this peer to carry.
                </p>
                {(formData.contextFiles ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground/60 italic">No context files added yet.</p>
                )}
                <div className="space-y-3">
                    {(formData.contextFiles ?? []).map((file, idx) => (
                        <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <input
                                    className="flex-1 bg-background/60 border border-border rounded px-2 py-1 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary"
                                    value={file.name}
                                    onChange={e => updateContextFileName(idx, e.target.value)}
                                    placeholder="File name / title"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeContextFile(idx)}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Remove file"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <textarea
                                className="w-full bg-background/60 border border-border rounded px-3 py-2 text-xs font-mono outline-none resize-y focus:ring-1 focus:ring-primary"
                                value={file.content}
                                onChange={e => setFormData(prev => ({
                                    ...prev,
                                    contextFiles: (prev.contextFiles ?? []).map((f, i) => i === idx ? { ...f, content: e.target.value } : f),
                                }))}
                                placeholder="Paste document content here..."
                                rows={6}
                            />
                            <p className="text-[10px] text-muted-foreground/60">{file.content.length.toLocaleString()} chars</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 py-2">
                <input
                    type="checkbox"
                    id="is-enabled"
                    checked={formData.enabled}
                    onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="is-enabled" className="text-sm font-medium">Enable this participant</label>
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
            probeLocalProvider(peer.baseURL, peer.provider).catch(() => { });
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
                        {isActive ? 'In Set' : 'Add to Set'}
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
                            {peer.type === 'ai' ? `${peer.provider} interface / ${peer.model}` : 'Human Participant'}
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
                            {readiness.state === 'locked'
                                ? 'Locked'
                                : readiness.state === 'unreachable'
                                    ? 'Access Path Unreachable'
                                    : readiness.state === 'missing_key'
                                        ? 'Missing Key'
                                        : 'Missing Config'}
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
