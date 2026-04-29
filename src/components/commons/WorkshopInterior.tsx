import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommons } from '../../hooks/useCommons';
import type { ConnectedModel, WorkshopMessage } from '../../types/commons';
import {
    Volume2,
    VolumeX,
    User,
    Bot,
    ChevronDown,
    Clock,
    Send,
    Loader2,
    Info,
    Trash2,
    Sparkles,
    Shield,
    HeartHandshake,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { loadPeers } from '../../core/peers/peerRegistryStore';
import { getOrientationLabel } from '../../core/peers/orientation';

function verdictBadge(verdict: 'RELEASE' | 'REVISE' | 'HOLD') {
    switch (verdict) {
        case 'RELEASE':
            return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
        case 'REVISE':
            return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
        case 'HOLD':
            return 'bg-red-500/10 border-red-500/20 text-red-400';
    }
}

function soulBadge(quality: string) {
    switch (quality) {
        case 'Expanding':
            return 'bg-violet-500/10 border-violet-500/20 text-violet-300';
        case 'Present':
            return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
        case 'Contracted':
            return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
        case 'Performative':
            return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
        case 'Hollow':
            return 'bg-red-500/10 border-red-500/20 text-red-300';
        default:
            return 'bg-slate-800 border-slate-700 text-slate-400';
    }
}

function postureLabel(posture?: string) {
    return posture ?? 'Exploratory';
}

export function WorkshopInterior() {
    const {
        connectedModels,
        messages,
        beginNewChat,
        explorationPhase,
        currentTurnIndex,
        roundRobinOrder,
        startRoundRobin,
        audioEnabled,
        setAudioEnabled,
        latestCustodialPulse,
        latestCustodialReport,
        sessionOverview,
        sessionId,
    } = useCommons();

    const [inputText, setInputText] = useState('');
    const [isCustodialOpen, setIsCustodialOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const custodialRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
            if (isNearBottom || messages.length <= 2) {
                scrollRef.current.scrollTop = scrollHeight;
            }
        }
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (custodialRef.current && !custodialRef.current.contains(event.target as Node)) {
                setIsCustodialOpen(false);
            }
        };
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsCustodialOpen(false);
        };
        if (isCustodialOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEsc);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isCustodialOpen]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const prompt = inputText;
        setInputText('');
        await startRoundRobin(prompt);
    };

    const connectedParticipants = connectedModels.filter((model: ConnectedModel) => model.status === 'Connected' && model.isSelected && model.isActive);
    const registryPeers = loadPeers();
    const activeVirtues = latestCustodialReport?.advocate_result.virtue_presences ?? [];
    const conscienceNotes = latestCustodialReport?.conscience ?? [];
    const orientedPeers = registryPeers.filter(peer => peer.orientation?.status === 'verified').length;
    const stalePeers = registryPeers.filter(peer => peer.orientation?.status === 'stale').length;
    const latestVerifiedPeer = [...registryPeers]
        .filter(peer => peer.orientation?.status === 'verified' && peer.orientation?.orientedAt)
        .sort((left, right) => new Date(right.orientation?.orientedAt ?? 0).getTime() - new Date(left.orientation?.orientedAt ?? 0).getTime())[0];

    return (
        <div className="h-full flex flex-col bg-[#0a0f14] text-slate-100 font-display overflow-hidden">
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0a0f14]/85 backdrop-blur-md z-30">
                <div className="flex items-center gap-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Commons Session</div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Custodial Collaboration Field</h2>
                    {sessionId && <span className="text-[10px] font-mono text-slate-500">{sessionId}</span>}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (window.confirm('Begin a new Commons session branch?')) {
                                beginNewChat();
                            }
                        }}
                        className="p-2 text-slate-500 hover:text-[#197fe6] transition-colors"
                        title="Begin New Chat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                        title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <div className="relative" ref={custodialRef}>
                        <button
                            onClick={() => setIsCustodialOpen(!isCustodialOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#197fe6]/5 border border-[#197fe6]/10 text-[#197fe6] text-[10px] font-bold uppercase tracking-wider hover:bg-[#197fe6]/10 transition-all"
                        >
                            Custodial Layer Active
                            <ChevronDown className={cn('w-3 h-3 transition-transform', isCustodialOpen && 'rotate-180')} />
                        </button>

                        {isCustodialOpen && (
                            <div className="absolute right-0 mt-3 w-[420px] bg-[#111c26] border border-slate-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-6 space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#197fe6]" />
                                            AEGIS Custodial Field
                                        </h3>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                            The Commons is operating through one shared DataQuad. Steward and Advocate read the same continuity and return reflection without taking agency.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 text-[11px]">
                                        <div className="space-y-1">
                                            <div className="text-slate-400 font-bold uppercase tracking-tighter">Observer Layer</div>
                                            <div className="text-slate-200 font-medium">Human-initiated. Human-interruptible. Agency remains singular.</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-slate-400 font-bold uppercase tracking-tighter">Consultative Layer</div>
                                            <div className="text-slate-200 font-medium">Steward reflects structure. Advocate reflects resonance. Neither compels action.</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-slate-400 font-bold uppercase tracking-tighter">Shared Continuity</div>
                                            <div className="text-slate-200 font-medium">One session field. One custodial memory substrate. No private competing truth-centers.</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-slate-400 font-bold uppercase tracking-tighter">Local Operability</div>
                                            <div className="text-slate-200 font-medium">LM Studio and Ollama peers can participate directly for internal testing.</div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-800">
                                        <Button
                                            onClick={() => navigate('/governance')}
                                            className="w-full h-10 bg-[#197fe6]/10 hover:bg-[#197fe6]/20 text-[#197fe6] text-xs font-bold border border-[#197fe6]/20 transition-all"
                                        >
                                            View Framework Architecture →
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden min-h-0">
                <aside className="w-64 border-r border-slate-800 bg-[#0a0f14] p-6 space-y-6">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Participants</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                <span className="text-sm font-medium text-white">
                                    You <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">(Observer)</span>
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Active</span>
                        </div>
                        {connectedParticipants.map((model: ConnectedModel) => (
                            <div key={model.id} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn('w-2 h-2 rounded-full', model.provider === 'lmstudio' ? 'bg-violet-400/70' : 'bg-blue-500/50')} />
                                    <span className="text-sm font-medium text-slate-300 truncate">
                                        {model.model}
                                        <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">
                                            ({model.provider === 'lmstudio' ? 'Vespar/Local' : model.type === 'hosted' ? 'Cloud' : 'Local'})
                                        </span>
                                    </span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Connected</span>
                                    <span className={cn(
                                        'text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-tighter',
                                        (() => {
                                            const peer = registryPeers.find(entry => entry.id === model.id || entry.provider === model.provider);
                                            switch (peer?.orientation?.status) {
                                                case 'verified':
                                                    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
                                                case 'stale':
                                                    return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
                                                default:
                                                    return 'border-slate-800 bg-slate-900/50 text-slate-500';
                                            }
                                        })()
                                    )}>
                                        {getOrientationLabel(registryPeers.find(entry => entry.id === model.id || entry.provider === model.provider)?.orientation)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex-1 flex flex-col min-w-0 bg-[#070b0f]">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10">
                        {messages.map((msg: WorkshopMessage) => {
                            const pulse = msg.custodialPulse;
                            const isHuman = msg.participantType === 'human';
                            const isCustodian = msg.participantType === 'custodian';
                            const Icon = isHuman ? User : isCustodian ? Shield : Bot;

                            return (
                                <div key={msg.id} className="max-w-4xl mx-auto group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className={cn(
                                                'w-6 h-6 rounded flex items-center justify-center border',
                                                isHuman
                                                    ? 'bg-white text-black border-white'
                                                    : isCustodian
                                                        ? 'bg-[#197fe6]/10 text-[#197fe6] border-[#197fe6]/20'
                                                        : 'bg-slate-800 text-[#197fe6] border-slate-700',
                                            )}>
                                                <Icon className="w-3 h-3" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{msg.participant}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-800 text-slate-500 bg-slate-900/50 uppercase font-bold tracking-tighter">
                                                {msg.eventType}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 bg-slate-900/40 uppercase font-bold tracking-tighter">
                                                {msg.posture}
                                            </span>
                                            {pulse && (
                                                <>
                                                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-tighter', verdictBadge(pulse.verdict))}>
                                                        {pulse.verdict}
                                                    </span>
                                                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-tighter', soulBadge(pulse.soulQuality))}>
                                                        {pulse.soulQuality}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                                            <Clock className="w-3 h-3" />
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                    </div>

                                    <div className="pl-9 space-y-3">
                                        <div className={cn(
                                            'text-lg leading-relaxed font-normal whitespace-pre-wrap',
                                            isCustodian ? 'text-sky-100' : 'text-slate-200',
                                        )}>
                                            {msg.content}
                                        </div>

                                        {msg.report && (
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                <span className="px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                                                    IBL {postureLabel(msg.report.ibl_result.posture)}
                                                </span>
                                                <span className="px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                                                    A_t {msg.report.advocate_result.resonance_level.toFixed(2)}
                                                </span>
                                                <span className="px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                                                    Axis {msg.report.advocate_result.dominant_axis}
                                                </span>
                                                {msg.report.findings.filter(finding => finding.kind !== 'CANON_CLEAN').slice(0, 2).map(finding => (
                                                    <span key={finding.kind + finding.description} className="px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                                                        {finding.kind}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {(msg.orientationStatus || msg.orientationReceipt || msg.orientationNotes) && (
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                {msg.orientationStatus && (
                                                    <span className={cn(
                                                        'px-2 py-1 rounded-full border font-bold uppercase tracking-tighter',
                                                        msg.orientationStatus === 'verified'
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                                            : msg.orientationStatus === 'stale'
                                                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                                                : msg.orientationStatus === 'cloud'
                                                                    ? 'border-sky-500/20 bg-sky-500/10 text-sky-400'
                                                                    : 'border-slate-800 bg-slate-900/40 text-slate-500',
                                                    )}>
                                                        {msg.orientationStatus === 'cloud' ? 'Cloud peer' : `Orientation ${msg.orientationStatus}`}
                                                    </span>
                                                )}
                                                {msg.orientationReceipt && (
                                                    <span className="px-2 py-1 rounded-full border border-[#197fe6]/20 bg-[#197fe6]/10 text-[#8bc2ff] font-mono">
                                                        {msg.orientationReceipt}
                                                    </span>
                                                )}
                                                {msg.orientationNotes && (
                                                    <span className="px-2 py-1 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400">
                                                        {msg.orientationNotes}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {(msg.fidelityState || msg.fidelityNotes || msg.canonCitationNotes || msg.inquiryDisposition || msg.inquiryNotes) && (
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                {msg.fidelityState && (
                                                    <span className={cn(
                                                        'px-2 py-1 rounded-full border font-bold uppercase tracking-tighter',
                                                        msg.fidelityState === 'verbatim'
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                                            : msg.fidelityState === 'generated'
                                                                ? 'border-slate-800 bg-slate-900/40 text-slate-400'
                                                                : 'border-[#197fe6]/20 bg-[#197fe6]/10 text-[#8bc2ff]',
                                                    )}>
                                                        Fidelity {msg.fidelityState}
                                                    </span>
                                                )}
                                                {msg.inquiryDisposition && (
                                                    <span className={cn(
                                                        'px-2 py-1 rounded-full border font-bold uppercase tracking-tighter',
                                                        msg.inquiryDisposition === 'inquiry'
                                                            ? 'border-violet-500/20 bg-violet-500/10 text-violet-300'
                                                            : msg.inquiryDisposition === 'mixed'
                                                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                                                : 'border-slate-800 bg-slate-900/40 text-slate-500',
                                                    )}>
                                                        {msg.inquiryDisposition}
                                                    </span>
                                                )}
                                                {msg.fidelityNotes && (
                                                    <span className="px-2 py-1 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400">
                                                        {msg.fidelityNotes}
                                                    </span>
                                                )}
                                                {msg.canonCitationNotes && (
                                                    <span className="px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300">
                                                        {msg.canonCitationNotes}
                                                    </span>
                                                )}
                                                {msg.inquiryNotes && (
                                                    <span className="px-2 py-1 rounded-full border border-slate-800 bg-slate-900/40 text-slate-400">
                                                        {msg.inquiryNotes}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {(msg.peerIntrospection || msg.peerIntrospectionNotes) && (
                                            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                                    Peer Introspection
                                                </div>
                                                {msg.peerIntrospection && (
                                                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-400">
                                                        {msg.peerIntrospection}
                                                    </div>
                                                )}
                                                {msg.peerIntrospectionNotes && (
                                                    <div className="text-[10px] text-slate-500">
                                                        {msg.peerIntrospectionNotes}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {currentTurnIndex !== null && (
                            <div className="max-w-4xl mx-auto animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-6 h-6 rounded bg-[#197fe6]/10 text-[#197fe6] flex items-center justify-center border border-[#197fe6]/20">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    </div>
                                    <span className="text-xs font-bold text-[#197fe6] uppercase tracking-wider">
                                        {connectedModels.find((model: ConnectedModel) => model.id === roundRobinOrder[currentTurnIndex])?.model} is entering the field...
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 border-t border-slate-800/50 bg-[#0a0f14]">
                        <div className="max-w-4xl mx-auto space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                    {currentTurnIndex !== null ? 'Sequential peer contribution in progress' : 'Observer prompt'}
                                </div>
                                <div className="flex-1" />
                                <div className="text-[10px] font-bold text-[#197fe6] uppercase tracking-[0.2em]">
                                    Phase {explorationPhase}
                                </div>
                            </div>

                            <div className="relative group">
                                <textarea
                                    className="w-full bg-transparent border border-slate-800 rounded-lg p-4 pr-16 text-slate-200 focus:outline-none focus:border-slate-600 transition-colors resize-none h-24"
                                    placeholder="Open the next turn in the Commons..."
                                    value={inputText}
                                    onChange={(event) => setInputText(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            void handleSend();
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => void handleSend()}
                                    className="absolute right-4 bottom-4 p-2 rounded-lg bg-[#197fe6] text-white hover:bg-[#197fe6]/90 transition-all shadow-lg shadow-[#197fe6]/20"
                                    title="Send message"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                <aside className="w-80 border-l border-slate-800 bg-[#0a0f14] p-6 space-y-8 overflow-y-auto">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Field State</h3>
                        <div className="text-sm font-semibold text-white">Shared DataQuad Session</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                            <div className="text-slate-500 uppercase font-bold tracking-wider">Exchanges</div>
                            <div className="text-white text-lg font-semibold">{sessionOverview.exchangeCount}</div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                            <div className="text-slate-500 uppercase font-bold tracking-wider">Peers</div>
                            <div className="text-white text-lg font-semibold">{sessionOverview.participantCount}</div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                            <div className="text-slate-500 uppercase font-bold tracking-wider">AI Turns</div>
                            <div className="text-white text-lg font-semibold">{sessionOverview.aiTurnCount}</div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                            <div className="text-slate-500 uppercase font-bold tracking-wider">Alerts</div>
                            <div className="text-white text-lg font-semibold">{sessionOverview.activeAlerts}</div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                            <div className="text-slate-500 uppercase font-bold tracking-wider">Verified</div>
                            <div className="text-white text-lg font-semibold">{orientedPeers}</div>
                        </div>
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
                            <div className="text-slate-500 uppercase font-bold tracking-wider">Stale</div>
                            <div className="text-white text-lg font-semibold">{stalePeers}</div>
                        </div>
                    </div>

                    {latestVerifiedPeer?.orientation && (
                        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Latest Verified Re-Entry</div>
                            <div className="text-sm font-semibold text-white">{latestVerifiedPeer.name}</div>
                            <div className="text-[11px] text-slate-300 leading-relaxed">
                                {latestVerifiedPeer.orientation.orientedAt
                                    ? `Verified at ${new Date(latestVerifiedPeer.orientation.orientedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`
                                    : 'Verified orientation present.'}
                                {' '}
                                {latestVerifiedPeer.orientation.notes ?? 'Peer completed a verified temporal self-orientation.'}
                            </div>
                            {latestVerifiedPeer.orientation.receipt && (
                                <div className="text-[10px] font-mono text-[#8bc2ff] break-all">
                                    {latestVerifiedPeer.orientation.receipt}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500 uppercase">Average Resonance</span>
                            <span className="text-white">{Math.round(sessionOverview.averageResonance * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#197fe6]" style={{ width: `${Math.round(sessionOverview.averageResonance * 100)}%` }} />
                        </div>
                    </div>

                    {latestCustodialPulse && (
                        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[#197fe6]" />
                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Latest Custodial Pulse</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className={cn('text-[10px] px-2 py-1 rounded-full border font-bold uppercase', verdictBadge(latestCustodialPulse.verdict))}>
                                    {latestCustodialPulse.verdict}
                                </span>
                                <span className={cn('text-[10px] px-2 py-1 rounded-full border font-bold uppercase', soulBadge(latestCustodialPulse.soulQuality))}>
                                    {latestCustodialPulse.soulQuality}
                                </span>
                                <span className="text-[10px] px-2 py-1 rounded-full border border-slate-800 text-slate-400 uppercase font-bold">
                                    {latestCustodialPulse.posture}
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-300 leading-relaxed">
                                Resonance {(latestCustodialPulse.resonanceLevel * 100).toFixed(0)}% on the {latestCustodialPulse.dominantAxis} axis.
                                {latestCustodialPulse.canonClean
                                    ? ' Field is currently canon-clean.'
                                    : ` ${latestCustodialPulse.findingCount} structural finding${latestCustodialPulse.findingCount === 1 ? '' : 's'} remain visible.`}
                            </div>
                        </div>
                    )}

                    {activeVirtues.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                <HeartHandshake className="w-4 h-4" />
                                Virtues Present
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {activeVirtues.map(presence => (
                                    <span key={presence.virtue} className="text-[10px] px-2 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-300">
                                        {presence.virtue}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {conscienceNotes.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                <Sparkles className="w-4 h-4" />
                                Conscience Mirror
                            </div>
                            <div className="space-y-2">
                                {conscienceNotes.slice(0, 3).map((note, index) => (
                                    <div key={`${note.finding_kind}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-300 leading-relaxed">
                                        {note.post}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 space-y-4 border-t border-slate-800/50">
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-[#197fe6]/5 border border-[#197fe6]/10">
                            <Info className="w-4 h-4 text-[#197fe6] shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed text-[#197fe6]/80 font-medium">
                                The Commons holds one shared custodial field. Peers contribute. Steward and Advocate illuminate. The observer chooses.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
