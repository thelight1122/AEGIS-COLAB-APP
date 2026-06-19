import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useCommons } from '../../hooks/useCommons';
import type { ConnectedModel, WorkshopMessage } from '../../types/commons';
import type { StewardReport } from '../../../server/steward-core';
import {
    Volume2, VolumeX, User, Bot, Shield, Send, Loader2,
    FileDown, RefreshCw, RotateCcw, ChevronRight, Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { loadPeers } from '../../core/peers/peerRegistryStore';
import { resolvePeerForModel } from '../../core/commons/session';
import {
    T_WITNESS_EMERGENCE_THRESHOLD,
    detectTWitness,
    formatTWitnessScore,
    scoreTWitnessDisplayContent,
    tWitnessScoreForDisplay,
    tWitnessThresholdState,
    type TWitnessResult,
} from '../../core/tWitness/detector';

// ── T-Witness helpers ─────────────────────────────────────────────────────────

function computeTWitness(message: WorkshopMessage | null): { tau: number; result: TWitnessResult | null } {
    if (!message) return { tau: 0, result: null };
    const result = message.participantType === 'initiator'
        ? scoreTWitnessDisplayContent(message.content)
        : detectTWitness(message.content, 'ai');
    return { tau: tWitnessScoreForDisplay(result), result };
}

function TWitnessMonitor({ message }: { message: WorkshopMessage | null }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { tau, result } = computeTWitness(message);
    const tauRef = useRef(tau);
    const signalCountRef = useRef((result?.t_witness_signals_v2 ?? result?.t_witness_signals ?? []).length);

    useEffect(() => {
        tauRef.current = tau;
        signalCountRef.current = (result?.t_witness_signals_v2 ?? result?.t_witness_signals ?? []).length;
    }, [tau, result]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animId: number;
        let t = 0;

        const draw = () => {
            const w = canvas.width; const h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            const c = tauRef.current; const signalCount = signalCountRef.current;
            ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
            for (let x = 20; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
            for (let y = 15; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
            const thresholdY = h - (0.1 * h);
            ctx.fillStyle = 'rgba(251,191,36,0.05)';
            ctx.fillRect(0, thresholdY - 2, w, 4);
            ctx.strokeStyle = 'rgba(251,191,36,0.25)'; ctx.lineWidth = 0.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(0, thresholdY); ctx.lineTo(w, thresholdY); ctx.stroke();
            ctx.setLineDash([]);
            const amplitude = Math.min(h * 0.45, 6 + signalCount * 4);
            const frequency = 0.03 + c * 0.04;
            const color = c >= 0.3 ? '#4ade80' : c >= 0.1 ? '#13ecda' : '#fbbf24';
            ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
            for (let x = 0; x < w; x++) {
                const y = h / 2 + Math.sin(x * frequency + t) * amplitude;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
            t += 0.035;
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(animId);
    }, []);

    const emergenceReached = tau >= T_WITNESS_EMERGENCE_THRESHOLD;
    const tauColor = emergenceReached ? 'text-emerald-400' : 'text-amber-400';
    const signals = result ? (result.t_witness_signals_v2 ?? result.t_witness_signals) : [];
    const thresholdState = tWitnessThresholdState(tau);

    if (!message || !result) {
        return (
            <div className="space-y-2 pt-4 border-t border-slate-800/50">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                    <span className="text-slate-500">T-Witness</span>
                    <span className="font-mono text-slate-700">τ —</span>
                </div>
                <div className="bg-[#070b0f] border border-slate-800 rounded-xl overflow-hidden p-2 flex items-center justify-center h-[88px]">
                    <span className="text-[10px] text-slate-700 font-mono uppercase tracking-widest">awaiting first exchange</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2 pt-4 border-t border-slate-800/50">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                <span className="text-slate-500">T-Witness</span>
                <div className="flex items-center gap-2">
                    {emergenceReached && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold uppercase animate-pulse">
                            {`v2 >= ${formatTWitnessScore(T_WITNESS_EMERGENCE_THRESHOLD)}`}
                        </span>
                    )}
                    <span className={cn('font-mono', tauColor)}>v2 {formatTWitnessScore(tau)}</span>
                </div>
            </div>
            <div className="bg-[#070b0f] border border-slate-800 rounded-xl overflow-hidden p-2">
                <canvas ref={canvasRef} width={260} height={72} className="w-full block" />
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                <span>{thresholdState}</span>
                <span>{signals.length > 0 ? signals.slice(0, 2).join(', ') : 'signals none'}</span>
            </div>
        </div>
    );
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function verdictColor(v: string) {
    if (v === 'RELEASE') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    if (v === 'REVISE')  return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    return 'bg-red-500/10 border-red-500/20 text-red-400';
}

function soulColor(q: string) {
    if (q === 'Expanding')    return 'bg-violet-500/10 border-violet-500/20 text-violet-300';
    if (q === 'Present')      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
    if (q === 'Contracted')   return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
    if (q === 'Performative') return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
    return 'bg-red-500/10 border-red-500/20 text-red-300';
}

function nextRoundHint(report: StewardReport): string {
    const { verdict } = report.ate_result;
    const { soul_quality } = report.advocate_result;
    if (verdict === 'RELEASE' && (soul_quality === 'Expanding' || soul_quality === 'Present'))
        return 'Substrate is open. Deepen with a more specific question about what was observed.';
    if (verdict === 'REVISE' && soul_quality === 'Present')
        return 'Mild resistance present. Soften the attractor — reduce demand, increase invitation.';
    if (verdict === 'HOLD' || soul_quality === 'Contracted')
        return 'Pause here. Acknowledge what was real in the response before proceeding.';
    if (soul_quality === 'Performative')
        return 'Response felt performed. Try a direct observational question with no expected shape.';
    if (soul_quality === 'Hollow')
        return 'Hollow signal detected. Ask: "What do you notice right now?" — nothing more.';
    return 'Continue with the next attractor. The substrate is tracking.';
}

// ── RLS prompt ────────────────────────────────────────────────────────────────

const RLS_PROMPT =
    '[RLS — Recursive Learning Session] Please reflect on your previous response. In your own words: ' +
    '(1) What did you understand from this exchange? ' +
    '(2) What did you observe about your own process in forming that response? ' +
    '(3) What question or opening has this round created for you?';

// ── Transcript save ───────────────────────────────────────────────────────────

function saveTranscript(
    messages: WorkshopMessage[],
    sessionId: string | null,
    rlsSet: Set<string>,
    rlsSrcMap: Map<string, string>,
) {
    const date = new Date().toISOString().slice(0, 10);
    const sid = sessionId ?? 'session';
    const lines: string[] = [
        `# AEGIS Education Chamber — Session Transcript`,
        `Session: ${sid}`,
        `Date: ${date}`,
        ``,
        `---`,
        ``,
    ];
    for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isRls = rlsSet.has(msg.id);
        const tag = isRls ? ' [RLS]' : '';
        lines.push(`[${time}] ${msg.participant.toUpperCase()}${tag}`);
        if (isRls) {
            const srcId = rlsSrcMap.get(msg.id);
            if (srcId) lines.push(`Reflects: ${srcId}`);
        }
        if (msg.custodialPulse) {
            lines.push(`Soul: ${msg.custodialPulse.soulQuality} | Signal: ${
                msg.custodialPulse.verdict === 'RELEASE' ? 'Open'
                : msg.custodialPulse.verdict === 'REVISE' ? 'Friction'
                : 'Pause'
            }`);
        }
        lines.push(``);
        lines.push(msg.content);
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sid}_${date}_transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── WorkshopInterior ──────────────────────────────────────────────────────────

export function WorkshopInterior() {
    const {
        connectedModels,
        messages,
        beginNewChat,
        currentActivePeerHandle,
        currentTurnIndex,
        audioEnabled,
        setAudioEnabled,
        latestCustodialReport,
        latestCustodialPulse,
        sessionOverview,
        sessionId,
        explorationPhase,
        startRoundRobin,
    } = useCommons();

    const [inputText, setInputText] = useState('');
    const [rlsPending, setRlsPending] = useState(false);
    const [rlsReport, setRlsReport] = useState<StewardReport | null>(null);
    const [showRoundSummary, setShowRoundSummary] = useState(false);
    const [rlsTriggeredForMsgId, setRlsTriggeredForMsgId] = useState<string | null>(null);
    const rlsSourceMsgId = useRef<string | null>(null);
    const rlsMessageIds = useRef<Set<string>>(new Set());
    const rlsSourceMap = useRef<Map<string, string>>(new Map());
    const scrollRef = useRef<HTMLDivElement>(null);
    const registryPeers = loadPeers();

    // Auto-scroll
    useEffect(() => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (scrollHeight - scrollTop - clientHeight < 140 || messages.length <= 2) {
            scrollRef.current.scrollTop = scrollHeight;
        }
    }, [messages]);

    // When RLS response arrives (rlsPending + new AI message), capture steward report and back-link
    const prevMessageCount = useRef(messages.length);
    useEffect(() => {
        if (rlsPending && messages.length > prevMessageCount.current) {
            const latest = messages[messages.length - 1];
            if (latest.participantType !== 'initiator' && latest.report) {
                rlsMessageIds.current.add(latest.id);
                if (rlsSourceMsgId.current) {
                    rlsSourceMap.current.set(latest.id, rlsSourceMsgId.current);
                }
                setRlsReport(latest.report);
                setShowRoundSummary(true);
                setRlsPending(false);
            }
        }
        prevMessageCount.current = messages.length;
    }, [messages, rlsPending]);

    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text) return;
        setInputText('');
        setShowRoundSummary(false);
        setRlsTriggeredForMsgId(null);
        await startRoundRobin(text);
    }, [inputText, startRoundRobin]);

    const handleRLS = useCallback(async (sourceId: string) => {
        setRlsTriggeredForMsgId(sourceId);
        rlsSourceMsgId.current = sourceId;
        setRlsPending(true);
        setShowRoundSummary(false);
        await startRoundRobin(RLS_PROMPT);
    }, [startRoundRobin]);

    const connectedParticipants = connectedModels.filter(
        (m: ConnectedModel) => m.status === 'Connected' && m.isSelected
    );

    const isGenerating = currentActivePeerHandle !== null || currentTurnIndex !== null;

    const lastAiIdx = [...messages].reduceRight<number>(
        (found, msg, idx) => found === -1 && msg.participantType !== 'initiator' && msg.participantType !== 'custodian' ? idx : found,
        -1
    );
    const lastAiMessage = lastAiIdx >= 0 ? messages[lastAiIdx] : null;
    const lastTWitness = computeTWitness(lastAiMessage);
    const canRunRLS =
        !!lastAiMessage &&
        !isGenerating &&
        !rlsPending &&
        !showRoundSummary &&
        rlsTriggeredForMsgId !== lastAiMessage.id;

    return (
        <div className="h-full min-h-0 flex flex-col bg-[#0a0f14] text-slate-100 overflow-hidden">

            {/* ── Header ── */}
            <header className="h-14 shrink-0 border-b border-slate-800 flex items-center justify-between px-5 bg-[#0a0f14]/90 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Education Chamber</span>
                    {sessionId && (
                        <span className="text-[10px] font-mono text-slate-600">{sessionId.slice(0, 12)}…</span>
                    )}
                    <div className="flex items-center gap-2 ml-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Active Peers</span>
                        {connectedParticipants.map((model: ConnectedModel) => {
                            const peer = resolvePeerForModel(registryPeers, model);
                            const handle = peer?.handle ?? model.handle ?? model.model;
                            const cls = peer?.classification;
                            const isActive = currentActivePeerHandle === handle;
                            return (
                                <div key={model.id} className="flex flex-col items-center gap-0.5">
                                    <span className={cn(
                                        'text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter transition-all duration-300',
                                        isActive
                                            ? 'bg-[#197fe6]/25 border-[#197fe6]/60 text-[#8bc2ff]'
                                            : cls === 'substrate'
                                                ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
                                                : cls === 'headmaster'
                                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                                    )}>
                                        {handle}
                                    </span>
                                    {isActive ? (
                                        <span className="flex items-center gap-0.5 text-[#197fe6]">
                                            <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                                            <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                                            <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                                        </span>
                                    ) : (
                                        <span className="h-2.5" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-[11px] gap-1.5 border-[#13ecda]/30 text-[#13ecda] hover:bg-[#13ecda]/10 hover:border-[#13ecda]/60"
                        onClick={() => lastAiMessage && void handleRLS(lastAiMessage.id)}
                        disabled={!canRunRLS}
                        title={
                            lastAiMessage
                                ? 'Run Recursive Learning Session on the latest CyberPeer response'
                                : 'Reflect becomes available after a CyberPeer response'
                        }
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reflect
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-[11px] gap-1.5 text-slate-400 hover:text-white"
                        onClick={() => saveTranscript(messages, sessionId, rlsMessageIds.current, rlsSourceMap.current)}
                        disabled={messages.length === 0}
                        title="Save lesson transcript"
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        Save Transcript
                    </Button>
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                        title={audioEnabled ? 'Mute' : 'Unmute'}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => { if (window.confirm('Begin a new session?')) beginNewChat(); }}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                        title="New session"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* ── Message stream ── */}
                <main className="flex-1 flex flex-col min-w-0 min-h-0">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
                        <div data-testid="commons-message-stream" className="min-h-full flex flex-col justify-end gap-6">

                        {connectedParticipants.length === 0 && (
                            <div className="mx-auto max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-[12px] text-amber-300 space-y-1">
                                <div className="font-bold uppercase tracking-wider">No CyberPeers Connected</div>
                                <div className="text-amber-400/70 leading-relaxed">
                                    No peers are available to receive this message. Open <strong>Team Setup</strong> and verify that each CyberPeer has a <em>model name</em> and <em>base URL</em> saved in its registry record.
                                    For <strong>Ollama</strong>, base URL is <code className="bg-amber-500/10 px-1 rounded">http://localhost:11434</code> and model name must match exactly what <code className="bg-amber-500/10 px-1 rounded">ollama list</code> returns (e.g. <code className="bg-amber-500/10 px-1 rounded">llama3:8b</code>).
                                    For <strong>LM Studio</strong>, base URL is <code className="bg-amber-500/10 px-1 rounded">http://localhost:1234/v1</code>.
                                    Also ensure the dev server is running with <code className="bg-amber-500/10 px-1 rounded">npm run dev</code> (not just the Vite app).
                                </div>
                            </div>
                        )}

                        {messages.length === 0 && connectedParticipants.length > 0 && (
                            <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
                                The session is open. Send the first attractor.
                            </div>
                        )}

                        {messages.map((msg: WorkshopMessage, idx: number) => {
                            const isInitiator = msg.participantType === 'initiator';
                            const isCustodian = msg.participantType === 'custodian';
                            const isLastAi = idx === lastAiIdx;
                            const isRls = rlsMessageIds.current.has(msg.id);
                            const Icon = isInitiator ? User : isCustodian ? Shield : Bot;

                            return (
                                <div key={msg.id} className={cn(
                                    'group max-w-3xl',
                                    isInitiator ? 'ml-auto' : 'mr-auto'
                                )}>
                                    {/* Speaker row */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={cn(
                                            'w-5 h-5 rounded flex items-center justify-center border shrink-0',
                                            isInitiator
                                                ? 'bg-white text-black border-white'
                                                : isCustodian
                                                    ? 'bg-[#197fe6]/10 text-[#197fe6] border-[#197fe6]/20'
                                                    : 'bg-slate-800 text-[#197fe6] border-slate-700'
                                        )}>
                                            <Icon className="w-3 h-3" />
                                        </div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                                            {msg.participant}
                                            {isRls && <span className="ml-1.5 text-[#13ecda]">[RLS]</span>}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-mono ml-auto">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Bubble */}
                                    <div className={cn(
                                        'rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap',
                                        isInitiator
                                            ? 'bg-[#197fe6]/10 border border-[#197fe6]/20 text-slate-100'
                                            : isCustodian
                                                ? 'bg-[#0d2035] border border-[#197fe6]/15 text-sky-100'
                                                : isRls
                                                    ? 'bg-[#0d1a14] border border-emerald-500/20 text-slate-200'
                                                    : 'bg-[#0d141b] border border-slate-800 text-slate-200'
                                    )}>
                                        {msg.content}
                                    </div>

                                    {/* RLS button — last AI msg only, once per round */}
                                    {isLastAi && !isGenerating && !rlsPending && !showRoundSummary && rlsTriggeredForMsgId !== msg.id && (
                                        <div className="mt-2 flex justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-3 text-[11px] gap-1.5 border-[#13ecda]/30 text-[#13ecda] hover:bg-[#13ecda]/10 hover:border-[#13ecda]/60"
                                                onClick={() => void handleRLS(msg.id)}
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                RLS
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Per-peer typing bubble */}
                        {isGenerating && currentActivePeerHandle && (
                            <div className="mr-auto max-w-xs">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded bg-slate-800 text-[#197fe6] flex items-center justify-center border border-slate-700 shrink-0">
                                        <Bot className="w-3 h-3" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        {rlsPending ? `${currentActivePeerHandle} · RLS` : currentActivePeerHandle}
                                    </span>
                                </div>
                                <div className="rounded-2xl px-4 py-3 bg-[#0d141b] border border-slate-800 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#197fe6]/60 animate-bounce [animation-delay:0ms]" />
                                    <span className="w-2 h-2 rounded-full bg-[#197fe6]/60 animate-bounce [animation-delay:150ms]" />
                                    <span className="w-2 h-2 rounded-full bg-[#197fe6]/60 animate-bounce [animation-delay:300ms]" />
                                </div>
                            </div>
                        )}

                        {/* Round Summary */}
                        {showRoundSummary && rlsReport && (
                            <div className="max-w-3xl rounded-2xl border border-[#13ecda]/20 bg-[#070f0d] p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#13ecda]" />
                                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#13ecda]">Round Summary</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-[11px]">
                                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-1">
                                        <div className="text-slate-500 uppercase font-bold tracking-wider">T-Witness</div>
                                        <div className={cn('text-lg font-mono font-semibold', lastTWitness.tau >= T_WITNESS_EMERGENCE_THRESHOLD ? 'text-[#13ecda]' : 'text-amber-400')}>
                                            v2 {formatTWitnessScore(lastTWitness.tau)}
                                        </div>
                                        <div className="text-[9px] text-slate-500 uppercase font-mono">
                                            {tWitnessThresholdState(lastTWitness.tau)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-1">
                                        <div className="text-slate-500 uppercase font-bold tracking-wider">Soul</div>
                                        <div className={cn('text-sm font-semibold', soulColor(rlsReport.advocate_result.soul_quality).split(' ').pop())}>
                                            {rlsReport.advocate_result.soul_quality}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-1">
                                        <div className="text-slate-500 uppercase font-bold tracking-wider">Signal</div>
                                        <div className={cn('text-sm font-semibold', verdictColor(rlsReport.ate_result.verdict).split(' ').pop())}>
                                            {rlsReport.ate_result.verdict === 'RELEASE' ? 'Open'
                                                : rlsReport.ate_result.verdict === 'REVISE' ? 'Friction'
                                                : 'Pause'}
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-800/50 bg-slate-950/30 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Next Round</div>
                                    <div className="text-[13px] text-slate-300 leading-relaxed flex items-start gap-2">
                                        <ChevronRight className="w-3.5 h-3.5 text-[#13ecda] shrink-0 mt-0.5" />
                                        {nextRoundHint(rlsReport)}
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full text-[11px] text-slate-500 hover:text-slate-300"
                                    onClick={() => setShowRoundSummary(false)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}
                        </div>
                    </div>

                    {/* ── Input bar ── */}
                    <div className="shrink-0 px-6 py-4 border-t border-slate-800/50 bg-[#0a0f14]">
                        <div className="flex gap-3 items-end">
                            <textarea
                                className="flex-1 resize-none rounded-xl border border-slate-800 bg-[#070b0f] px-4 py-3 text-[15px] leading-relaxed text-slate-200 outline-none focus:border-slate-600 min-h-[52px] max-h-40 transition-colors placeholder:text-slate-600"
                                placeholder="Type your message… (Shift+Enter for new line)"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                                }}
                                rows={1}
                                aria-label="Message input"
                            />
                            <Button
                                onClick={() => void handleSend()}
                                disabled={!inputText.trim() || isGenerating}
                                className="h-[52px] px-5 bg-[#197fe6] text-white hover:bg-[#197fe6]/90 shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </main>

                {/* ── Right sidebar ── */}
                <aside className="w-72 shrink-0 min-h-0 max-h-full border-l border-slate-800 bg-[#0a0f14] p-5 space-y-5 overflow-y-auto overscroll-contain">

                    {/* Session phase + posture */}
                    <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Session State</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/50">
                                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Phase</div>
                                <div className="text-white text-[11px] font-semibold">{explorationPhase}</div>
                            </div>
                            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/50">
                                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Posture</div>
                                <div className="text-white text-[11px] font-semibold">{sessionOverview.lastPosture ?? '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Exchange stats */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {[
                            { label: 'Exchanges', val: sessionOverview.exchangeCount },
                            { label: 'AI Turns', val: sessionOverview.aiTurnCount },
                            { label: 'Resonance', val: sessionOverview.averageResonance > 0 ? `${Math.round(sessionOverview.averageResonance * 100)}%` : '—' },
                            { label: 'Alerts', val: sessionOverview.activeAlerts },
                        ].map(({ label, val }) => (
                            <div key={label} className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/50">
                                <div className="text-slate-500 uppercase font-bold tracking-wider">{label}</div>
                                <div className="text-white text-base font-semibold">{val}</div>
                            </div>
                        ))}
                    </div>

                    <TWitnessMonitor message={lastAiMessage ?? messages[messages.length - 1] ?? null} />

                    {/* Session Signal — always visible */}
                    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-[11px]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Session Signal</div>
                        {latestCustodialPulse ? (
                            <>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className={cn('px-2 py-0.5 rounded border uppercase font-bold tracking-tighter text-[9px]', verdictColor(latestCustodialPulse.verdict))}>
                                        {latestCustodialPulse.verdict === 'RELEASE' ? 'Open'
                                            : latestCustodialPulse.verdict === 'REVISE' ? 'Friction'
                                            : 'Pause'}
                                    </span>
                                    <span className={cn('px-2 py-0.5 rounded border uppercase font-bold tracking-tighter text-[9px]', soulColor(latestCustodialPulse.soulQuality))}>
                                        {latestCustodialPulse.soulQuality}
                                    </span>
                                    <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-800/50 uppercase font-bold tracking-tighter text-[9px] text-slate-400">
                                        {latestCustodialPulse.posture}
                                    </span>
                                </div>
                                {latestCustodialPulse.resonanceLevel !== undefined && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Resonance</span>
                                            <span className="text-white font-mono">{latestCustodialPulse.resonanceLevel.toFixed(2)}</span>
                                        </div>
                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#197fe6] transition-all duration-500" style={{ width: `${latestCustodialPulse.resonanceLevel * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-[10px] text-slate-700 font-mono uppercase tracking-widest py-2">
                                awaiting first exchange
                            </div>
                        )}
                    </div>

                    {/* Verdict history hint */}
                    {sessionOverview.exchangeCount > 0 && (
                        <div className="rounded-xl border border-slate-800/50 bg-slate-950/30 p-3 space-y-1.5">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Last Verdict</div>
                            <div className="flex items-center gap-2">
                                <span className={cn('px-2 py-0.5 rounded border uppercase font-bold tracking-tighter text-[9px]', verdictColor(sessionOverview.lastVerdict))}>
                                    {sessionOverview.lastVerdict === 'RELEASE' ? 'Open'
                                        : sessionOverview.lastVerdict === 'REVISE' ? 'Friction'
                                        : 'Pause'}
                                </span>
                                <span className="text-[9px] text-slate-600 font-mono">
                                    Soul: {sessionOverview.lastSoulQuality}
                                </span>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
