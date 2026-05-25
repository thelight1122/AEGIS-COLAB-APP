"use client";
import { useState } from 'react';
import { useCommons } from '../../hooks/useCommons';
import type { ModelProvider, ConnectedModel } from '../../types/commons';
import {
    Shield, Check, AlertCircle, Loader2, Globe,
    Cpu, Lock, Unlock,
    Sparkles, ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useKeyring } from '../../contexts/KeyringContext';
import { useNavigate } from 'react-router-dom';
import { UnlockModal } from '../security/UnlockModal';
import { loadPeers, savePeers } from '../../core/peers/peerRegistryStore';
import { loadActiveTeam, setSelectedPeerIds } from '../../core/peers/activeTeamStore';
import type { LLMProvider } from '../../core/peers/types';
import { createUnverifiedOrientation } from '../../core/peers/orientation';
import { normalizeLocalEndpoint } from '../../core/providers/localEndpoint';
import { resolvePeerForModel } from '../../core/commons/session';

const MODEL_OPTIONS: { provider: ModelProvider, label: string, defaultModel: string }[] = [
    { provider: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
    { provider: 'gemini', label: 'Gemini (Google)', defaultModel: 'gemini-1.5-pro' },
    { provider: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet' },
    { provider: 'xai', label: 'xAI', defaultModel: 'grok-2-latest' }
];

const LOCAL_OPTIONS: { provider: ModelProvider, label: string, defaultEndpoint: string }[] = [
    { provider: 'lmstudio', label: 'LM Studio', defaultEndpoint: 'http://localhost:1234/v1' },
    { provider: 'ollama', label: 'Ollama', defaultEndpoint: 'http://localhost:11434' }
];

export function SessionInit() {
    const navigate = useNavigate();
    const { connectedModels, addModel, validateModel, enterWorkshop } = useCommons();
    const { status, keys } = useKeyring();

    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [localInputs, setLocalInputs] = useState<Record<string, { endpoint: string, model: string, apiKey?: string }>>({
        lmstudio: { endpoint: 'http://localhost:1234/v1', model: '', apiKey: '' },
        ollama: { endpoint: 'http://localhost:11434', model: '', apiKey: '' }
    });

    const isLocked = status === 'locked';
    const isUnlocked = status === 'unlocked';

    // Derived Ready State
    const connectedList = connectedModels.filter(m => m.status === 'Connected' && m.isSelected);
    const isReady = isUnlocked && connectedModels.some(m =>
        m.status === 'Connected' &&
        m.isSelected &&
        (m.type === 'local' || m.apiKey || keys[m.provider])
    );

    const readyParticipants = Array.from(new Set(connectedList.map(m => {
        const opt = [...MODEL_OPTIONS, ...LOCAL_OPTIONS].find(o => o.provider === m.provider);
        return opt?.label || m.provider;
    }))).slice(0, 3);

    const handleEnterWorkshop = () => {
        const currentPeers = loadPeers();
        const activeTeam = loadActiveTeam();
        const activeCommonsModels = connectedModels.filter(m => m.status === 'Connected' && m.isSelected);

        const nextPeers = [...currentPeers];
        const nextActiveTeamIds = new Set(activeTeam.selectedPeerIds);

        // Update/add substrate participants from Commons.
        activeCommonsModels.forEach(m => {
            const existingPeer = resolvePeerForModel(nextPeers, m);
            const existingIdx = existingPeer ? nextPeers.findIndex(p => p.id === existingPeer.id) : -1;
            if (existingIdx >= 0) {
                nextPeers[existingIdx].enabled = true;
                nextPeers[existingIdx].model = m.model;
                if (m.endpointUrl) nextPeers[existingIdx].baseURL = m.endpointUrl;
                nextPeers[existingIdx].orientation = createUnverifiedOrientation({
                    source: 'commons_session',
                    facet: 'system',
                    notes: 'Peer connected to Commons. Verified temporal orientation still pending.',
                });
                nextActiveTeamIds.add(nextPeers[existingIdx].id);
            } else {
                nextPeers.push({
                    id: m.peerId ?? m.id,
                    handle: m.handle ?? `@${m.model.toLowerCase().replace(/[^a-z0-9.-]+/g, '-') || m.id}`,
                    name: m.handle?.replace('@', '') || m.model,
                    type: 'ai',
                    provider: m.provider as LLMProvider,
                    model: m.model,
                    enabled: true,
                    domains: ['General', 'Engineering', 'Product'],
                    baseURL: m.endpointUrl,
                    orientation: createUnverifiedOrientation({
                        source: 'commons_session',
                        facet: 'system',
                        notes: 'Peer connected to Commons. Verified temporal orientation still pending.',
                    }),
                });
                nextActiveTeamIds.add(m.id);
            }
        });

        savePeers(nextPeers);
        setSelectedPeerIds(activeTeam, Array.from(nextActiveTeamIds));
        enterWorkshop();
    };

    const handleAddHosted = (provider: ModelProvider, model: string) => {
        const key = inputs[provider] || keys[provider];
        if (!key) return;

        addModel({ provider, model, apiKey: key, type: 'hosted' });
        setInputs(prev => ({ ...prev, [provider]: '' }));
    };

    const handleAddLocal = (provider: ModelProvider) => {
        const config = localInputs[provider as keyof typeof localInputs];
        if (!config.endpoint || !config.model) return;

        const key = config.apiKey || keys[provider];
        const endpointUrl = normalizeLocalEndpoint(config.endpoint);

        addModel({
            provider,
            model: config.model,
            apiKey: key,
            endpointUrl,
            type: 'local'
        });
    };

    const ModelCard = ({ opt, type }: { opt: { provider: ModelProvider, label: string, defaultModel?: string, defaultEndpoint?: string }, type: 'hosted' | 'local' }) => {
        const localConfig = localInputs[opt.provider as keyof typeof localInputs];
        const localEndpoint = normalizeLocalEndpoint(localConfig?.endpoint);
        const existing = connectedModels.find((m: ConnectedModel) => {
            if (m.provider !== opt.provider) return false;
            if (type === 'hosted') return m.model === opt.defaultModel;
            return m.model === localConfig?.model && m.endpointUrl === localEndpoint;
        });
        const hasSavedKey = !!keys[opt.provider];

        return (
            <div key={opt.provider} className="bg-[#1a242e] border border-slate-800 rounded-xl p-6 space-y-6 flex flex-col transition-all hover:border-slate-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{opt.label}</h3>
                    {existing?.status === 'Connected' && <Check className="w-5 h-5 text-green-500" />}
                    {existing?.status === 'Not Connected' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                    {isLocked && <Lock className="w-4 h-4 text-amber-500/50" />}
                </div>

                <div className="flex-1 space-y-4">
                    {type === 'hosted' ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex justify-between">
                                    ACCESS KEY
                                    {hasSavedKey && isUnlocked && (
                                        <span className="text-green-500 flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            Vault Key Ready
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder={hasSavedKey && isUnlocked ? "Using key from vault..." : "sk-..."}
                                    value={inputs[opt.provider] || ''}
                                    onChange={(e) => setInputs(prev => ({ ...prev, [opt.provider]: e.target.value }))}
                                    disabled={!!existing || (hasSavedKey && isUnlocked)}
                                />
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                                Runtime Model: {opt.defaultModel}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ACCESS PATH URL</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder={opt.defaultEndpoint}
                                    value={localInputs[opt.provider as keyof typeof localInputs]?.endpoint || ''}
                                    onChange={(e) => setLocalInputs(prev => ({
                                        ...prev,
                                        [opt.provider]: { ...prev[opt.provider as keyof typeof localInputs], endpoint: e.target.value }
                                    }))}
                                    disabled={!!existing}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">RUNTIME MODEL</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder="e.g. llama3"
                                    value={localInputs[opt.provider as keyof typeof localInputs]?.model || ''}
                                    onChange={(e) => setLocalInputs(prev => ({
                                        ...prev,
                                        [opt.provider]: { ...prev[opt.provider as keyof typeof localInputs], model: e.target.value }
                                    }))}
                                    disabled={!!existing}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ACCESS KEY (OPTIONAL)</label>
                                </div>
                                <input
                                    type="password"
                                    className="w-full bg-[#111921] border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-[#197fe6] outline-none transition-colors"
                                    placeholder={hasSavedKey && isUnlocked ? "Using key from vault..." : "Optional local auth"}
                                    value={localInputs[opt.provider as keyof typeof localInputs]?.apiKey || ''}
                                    onChange={(e) => setLocalInputs(prev => ({
                                        ...prev,
                                        [opt.provider]: { ...prev[opt.provider as keyof typeof localInputs], apiKey: e.target.value }
                                    }))}
                                    disabled={!!existing || (hasSavedKey && isUnlocked)}
                                />
                            </div>
                        </>
                    )}
                </div>

                {!existing ? (
                    isLocked ? (
                        <Button
                            onClick={() => setIsUnlockModalOpen(true)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
                        >
                            <Unlock className="w-4 h-4" />
                            Unlock Keys to Connect
                        </Button>
                    ) : (
                        <Button
                            onClick={() => type === 'hosted' ? handleAddHosted(opt.provider, opt.defaultModel || '') : handleAddLocal(opt.provider)}
                            className="w-full bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-bold"
                            disabled={type === 'hosted' ? (!inputs[opt.provider] && !hasSavedKey) : (!localInputs[opt.provider as keyof typeof localInputs]?.endpoint || !localInputs[opt.provider as keyof typeof localInputs]?.model)}
                        >
                            {hasSavedKey && isUnlocked ? 'Connect with Vault Key' : 'Add Participant'}
                        </Button>
                    )
                ) : (
                    <Button
                        onClick={() => validateModel(existing.id)}
                        className={cn(
                            "w-full font-bold",
                            existing.status === 'Connected'
                                ? "bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                                : "bg-[#197fe6] text-white"
                        )}
                        disabled={existing.status === 'Connected' || existing.status === 'Validating'}
                    >
                        {existing.status === 'Validating' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {existing.status === 'Connected' ? 'Connected' : 'Validate Connection'}
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="py-20 px-6">
            <UnlockModal
                isOpen={isUnlockModalOpen}
                onClose={() => setIsUnlockModalOpen(false)}
            />

            <div className="max-w-6xl mx-auto space-y-16">
                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-[#197fe6]/10 rounded-xl flex items-center justify-center text-[#197fe6] mb-6 relative">
                        <Shield className="w-8 h-8" />
                        {isReady && (
                            <div className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                            Initialize Your Commons Session
                        </h1>
                        {isReady && (
                            <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full animate-in slide-in-from-top-2">
                                <Sparkles className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">System Ready</span>
                            </div>
                        )}
                    </div>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Assemble your peer panel. Keys are stored encrypted on this device {isUnlocked ? 'and unlocked' : 'but protected'}.
                    </p>

                    {isLocked && (
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 text-sm font-medium animate-in fade-in zoom-in-95">
                            <Lock className="w-4 h-4" />
                            Vault is locked. Unlock to use saved keys.
                            <Button variant="link" size="sm" onClick={() => setIsUnlockModalOpen(true)} className="text-amber-500 h-auto p-0 font-bold underline ml-2">
                                Unlock Now
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-8" id="hosted-models-section">
                    <div className="flex items-center gap-4">
                        <Globe className="w-5 h-5 text-slate-500" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Hosted Runtime Interfaces</h2>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {MODEL_OPTIONS.map((opt) => (
                            <ModelCard key={opt.provider} opt={opt} type="hosted" />
                        ))}
                    </div>
                </div>

                <div className="space-y-8" id="local-models-section">
                    <div className="flex items-center gap-4">
                        <Cpu className="w-5 h-5 text-slate-500" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Local Runtime Interfaces</h2>
                        <div className="flex-1 h-px bg-slate-800" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {LOCAL_OPTIONS.map((opt) => (
                            <ModelCard key={opt.provider} opt={opt} type="local" />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-8 pt-8 text-center pb-20">
                    <div className="flex flex-col items-center gap-4">
                        {isReady ? (
                            <div className="space-y-6">
                                <Button
                                    size="lg"
                                    className="h-20 px-16 text-xl font-bold transition-all bg-[#197fe6] text-white shadow-2xl shadow-[#197fe6]/30 hover:scale-[1.02] hover:bg-[#197fe6]/90 gap-4"
                                    onClick={handleEnterWorkshop}
                                >
                                    Enter Commons Workshop
                                    <ArrowRight className="w-6 h-6" />
                                </Button>
                                <div className="flex flex-col items-center gap-1.5 grayscale opacity-70">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Participants Online</p>
                                    <p className="text-xs text-slate-400 font-medium">
                                        {readyParticipants.join(', ')} {readyParticipants.length < connectedList.length ? `and ${connectedList.length - readyParticipants.length} more` : ''}
                                    </p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => {
                                            const el = document.getElementById('hosted-models-section');
                                            el?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="text-slate-500 hover:text-white mt-2"
                                    >
                                        Add More Interfaces
                                    </Button>
                                </div>
                            </div>
                        ) : isUnlocked ? (
                            <div className="space-y-6">
                                <Button
                                    size="lg"
                                    className="h-16 px-12 text-lg font-bold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                                    disabled={true}
                                >
                                    Connect a Runtime Interface to Begin
                                </Button>
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => navigate('/settings')}
                                    className="text-slate-500 hover:text-white"
                                >
                                    Configure Interfaces in Settings
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <Button
                                    size="lg"
                                    className="h-16 px-12 text-lg font-bold bg-amber-600/20 text-amber-500 border border-amber-500/20 hover:bg-amber-600/30 transition-all gap-2"
                                    onClick={() => setIsUnlockModalOpen(true)}
                                >
                                    <Unlock className="w-5 h-5" />
                                    Unlock Keys to Connect
                                </Button>
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => navigate('/settings')}
                                    className="text-slate-500 hover:text-white"
                                >
                                    Manage in Settings
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-2 pt-4">
                        <p className="text-xs text-slate-500 flex items-center gap-2 font-medium opacity-60">
                            <Shield className="w-3 h-3" />
                            Security Integrity: Not sent to our servers.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
