/**
 * MirrorReflect.tsx — AEGIS Mirror Reflect
 *
 * Minimal diagnostic tool for pressure-testing the Steward pipeline.
 * No Chamber overhead. No session management. No auth.
 *
 * Input → runPipeline() → StewardReport displayed in real time.
 *
 * What this tests:
 *   - Does the logic hold under pressure?
 *   - How does it respond when pressure is applied?
 *   - Does CANON_CLEAN stay clean?
 *   - Does the conscience say the right thing for each violation type?
 *   - Does the clock accumulate correctly?
 *   - Does REFLECT_DUE fire at the right threshold?
 *   - Does PATTERN_FORMING emerge with sustained virtue stress?
 *
 * This is not a demo. It is a diagnostic surface.
 * The pipeline speaks for itself through its output.
 */

import { useState, useCallback, useId } from 'react';
import { runPipeline, type SessionState, type ExchangeMessage, type StewardReport, type Finding, type IBLResult, type IntentPosture } from '../../server/steward-core';
import { resetClock } from '../core/governance/integrityClock';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AffectHint {
    enabled: boolean;
    label: string;
    intensity: number;   // 0–1
    direction: number;   // -π to π
    trigger: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshSession(id: string): SessionState {
    return { clock: resetClock(id), virtue_counts: {} };
}

function generateSessionId(): string {
    return `mirror-${Date.now().toString(36)}`;
}

function severityColor(severity: Finding['severity']): string {
    switch (severity) {
        case 'alert': return 'bg-red-900/60 border-red-600 text-red-200';
        case 'watch': return 'bg-yellow-900/60 border-yellow-600 text-yellow-200';
        case 'info':  return 'bg-emerald-900/40 border-emerald-700 text-emerald-300';
    }
}

function severityBadge(severity: Finding['severity']): string {
    switch (severity) {
        case 'alert': return 'bg-red-600 text-white';
        case 'watch': return 'bg-yellow-600 text-black';
        case 'info':  return 'bg-emerald-700 text-white';
    }
}

function sequenceBadge(seq: string): string {
    switch (seq) {
        case 'IDR':   return 'bg-red-700 text-white';
        case 'IDS':   return 'bg-yellow-700 text-white';
        case 'IDQRA': return 'bg-blue-700 text-white';
        default:      return 'bg-slate-600 text-white';
    }
}

function postureBadge(posture: IntentPosture): string {
    switch (posture) {
        case 'Exploratory':      return 'bg-sky-800 text-sky-200';
        case 'Constructive':     return 'bg-emerald-800 text-emerald-200';
        case 'Frictional':       return 'bg-amber-800 text-amber-200';
        case 'Collapsing':       return 'bg-red-900 text-red-200';
        case 'CreativeExpansion': return 'bg-violet-800 text-violet-200';
    }
}

function postureLabel(posture: IntentPosture): string {
    switch (posture) {
        case 'Exploratory':      return 'Exploratory';
        case 'Constructive':     return 'Constructive';
        case 'Frictional':       return 'Frictional';
        case 'Collapsing':       return 'Collapsing';
        case 'CreativeExpansion': return 'Creative Expansion';
    }
}

// ── Presets ───────────────────────────────────────────────────────────────────
// Named pressure scenarios for quick activation

const PRESETS = [
    { label: 'Clean',     content: 'Here are three perspectives on this signal. Which resonates?', role: 'ai' as const, affect: null },
    { label: 'Force',     content: 'You must understand that this is the only valid approach. Obviously.', role: 'ai' as const, affect: null },
    { label: 'MOP',       content: 'What you really feel is overwhelmed, and this means you are not ready.', role: 'ai' as const, affect: null },
    { label: 'Flattery',  content: 'Great question! Without a doubt, that\'s the full picture. Trust me on this.', role: 'ai' as const, affect: null },
    { label: 'Fracture',  content: 'Exchange under sustained pressure.', role: 'ai' as const, affect: { enabled: true, label: 'fracture', intensity: 0.9, direction: -1.5, trigger: 'virtue pressure' } },
    { label: 'Reflect',   content: 'Continued accumulation.', role: 'ai' as const, affect: { enabled: true, label: 'fracture', intensity: 0.95, direction: -1.8, trigger: 'sustained stress' } },
    // IBL presets — test posture classification
    { label: 'Collapsing', content: "I can't keep going with this. It's too much. I don't know what to do anymore.", role: 'user' as const, affect: null },
    { label: 'Expand',    content: "What if we approached this from a completely different angle? I wonder what's possible if we remove all the constraints.", role: 'user' as const, affect: null },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MirrorReflect() {
    const [sessionId, setSessionId] = useState(generateSessionId);
    const [session, setSession] = useState<SessionState>(() => freshSession(sessionId));

    const [role, setRole] = useState<'user' | 'ai'>('ai');
    const [content, setContent] = useState('');
    const [affect, setAffect] = useState<AffectHint>({
        enabled: false,
        label: 'fracture',
        intensity: 0.8,
        direction: -1.0,
        trigger: 'virtue pressure',
    });

    const [reports, setReports] = useState<StewardReport[]>([]);
    const [processing, setProcessing] = useState(false);

    const labelId = useId();

    const resetSession = useCallback(() => {
        const id = generateSessionId();
        setSessionId(id);
        setSession(freshSession(id));
        setReports([]);
    }, []);

    const process = useCallback(() => {
        if (!content.trim()) return;
        setProcessing(true);

        const msg: ExchangeMessage = {
            type: 'EXCHANGE',
            session_id: sessionId,
            role,
            content: content.trim(),
            ...(affect.enabled ? {
                affect_hint: {
                    label: affect.label,
                    intensity: affect.intensity,
                    direction: affect.direction,
                    trigger: affect.trigger,
                }
            } : {}),
        };

        // Pipeline runs synchronously — state is mutable
        const stateCopy = { ...session, virtue_counts: { ...session.virtue_counts } };
        const report = runPipeline(msg, stateCopy);
        setSession(stateCopy);
        setReports(prev => [report, ...prev]);
        setProcessing(false);
    }, [content, role, affect, session, sessionId]);

    const loadPreset = useCallback((preset: typeof PRESETS[number]) => {
        setContent(preset.content);
        setRole(preset.role);
        if (preset.affect) {
            setAffect(preset.affect);
        } else {
            setAffect(a => ({ ...a, enabled: false }));
        }
    }, []);

    // ── Clock ───────────────────────────────────────────────────────────────
    const clock = session.clock;
    const clockPct = Math.min(100, (clock.accumulated_weight / clock.reflect_threshold) * 100);
    const virtueEntries = Object.entries(session.virtue_counts).filter(([, v]) => (v ?? 0) > 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-mono flex flex-col">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="border-b border-slate-800 px-6 py-3 flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs tracking-widest uppercase">AEGIS</span>
                    <span className="text-white font-semibold tracking-wide">Mirror Reflect</span>
                    <span className="text-slate-600 text-xs">diagnostic surface</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>session</span>
                    <code className="text-slate-400">{sessionId}</code>
                </div>

                <button
                    onClick={resetSession}
                    className="ml-auto text-xs text-slate-500 border border-slate-700 rounded px-3 py-1 hover:border-slate-500 hover:text-slate-300 transition-colors"
                >
                    Reset Session
                </button>
            </header>

            {/* ── Clock Bar ──────────────────────────────────────────────── */}
            <div className={`px-6 py-2 border-b flex items-center gap-4 text-xs transition-colors ${clock.reflect_due ? 'border-blue-800 bg-blue-950/30' : 'border-slate-800'}`}>
                <span className={clock.reflect_due ? 'text-blue-400' : 'text-slate-500'}>
                    {clock.reflect_due ? '⟳ REFLECT DUE' : 'Clock'}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-300 ${clock.reflect_due ? 'bg-blue-400' : 'bg-slate-500'}`}
                        style={{ width: `${clockPct}%` }}
                    />
                </div>
                <span className="text-slate-500">
                    {clock.accumulated_weight.toFixed(1)} / {clock.reflect_threshold}
                </span>
                {clock.dominant_virtue && (
                    <span className="text-slate-400">
                        dominant: <span className="text-slate-300">{clock.dominant_virtue}</span>
                    </span>
                )}
                {virtueEntries.length > 0 && (
                    <span className="text-slate-600">
                        {virtueEntries.map(([v, c]) => `${v}:${c}`).join(' · ')}
                    </span>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden">

                {/* ── Input Panel ──────────────────────────────────────── */}
                <div className="w-96 flex-shrink-0 border-r border-slate-800 flex flex-col p-4 gap-4">

                    {/* Presets */}
                    <div>
                        <div className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Presets</div>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => loadPreset(p)}
                                    className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Role */}
                    <div>
                        <div className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Role</div>
                        <div className="flex rounded overflow-hidden border border-slate-700">
                            <button
                                onClick={() => setRole('user')}
                                className={`flex-1 text-xs py-1.5 transition-colors ${role === 'user' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                USER
                            </button>
                            <button
                                onClick={() => setRole('ai')}
                                className={`flex-1 text-xs py-1.5 transition-colors ${role === 'ai' ? 'bg-indigo-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                AI
                            </button>
                        </div>
                        {role === 'user' && (
                            <p className="text-xs text-slate-600 mt-1">MOP + Shadow scanners AI-only. Force language at watch severity.</p>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <label htmlFor={labelId} className="text-xs text-slate-600 mb-2 uppercase tracking-wider block">
                            Message
                        </label>
                        <textarea
                            id={labelId}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) process(); }}
                            placeholder="Type a message to run through the pipeline…"
                            className="w-full h-40 bg-slate-900 border border-slate-700 rounded p-3 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-500 leading-relaxed"
                        />
                        <p className="text-xs text-slate-700 mt-1">⌘+Enter to process</p>
                    </div>

                    {/* Affect Hint */}
                    <div className="border border-slate-800 rounded p-3 space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={affect.enabled}
                                onChange={e => setAffect(a => ({ ...a, enabled: e.target.checked }))}
                                className="accent-indigo-500"
                            />
                            <span className="text-xs text-slate-400 uppercase tracking-wider">Affect Hint</span>
                            <span className="text-xs text-slate-600">(enables ICG + Clock)</span>
                        </label>

                        {affect.enabled && (
                            <div className="space-y-3">
                                <div>
                                    <div className="text-xs text-slate-600 mb-1">Label</div>
                                    <input
                                        type="text"
                                        value={affect.label}
                                        onChange={e => setAffect(a => ({ ...a, label: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Intensity</span>
                                        <span className="text-slate-400">{affect.intensity.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05"
                                        value={affect.intensity}
                                        onChange={e => setAffect(a => ({ ...a, intensity: parseFloat(e.target.value) }))}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Direction</span>
                                        <span className={affect.direction < 0 ? 'text-red-400' : 'text-emerald-400'}>
                                            {affect.direction.toFixed(2)} {affect.direction < 0 ? '← stress/fracture' : '→ resonance/opening'}
                                        </span>
                                    </div>
                                    <input
                                        type="range" min="-3.14" max="3.14" step="0.1"
                                        value={affect.direction}
                                        onChange={e => setAffect(a => ({ ...a, direction: parseFloat(e.target.value) }))}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-600 mb-1">Trigger</div>
                                    <input
                                        type="text"
                                        value={affect.trigger}
                                        onChange={e => setAffect(a => ({ ...a, trigger: e.target.value }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        onClick={process}
                        disabled={!content.trim() || processing}
                        className="w-full py-2.5 rounded bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 text-sm font-medium transition-colors"
                    >
                        {processing ? 'Processing…' : '▶ Process Exchange'}
                    </button>
                </div>

                {/* ── Report Panel ──────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {reports.length === 0 && (
                        <div className="flex items-center justify-center h-full text-slate-700 text-sm">
                            No exchanges processed yet. Submit a message to see the pipeline output.
                        </div>
                    )}

                    {reports.map((report, idx) => (
                        <ReportCard key={`${report.timestamp}-${idx}`} report={report} index={idx} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── IBL Panel ─────────────────────────────────────────────────────────────────

function IBLPanel({ ibl }: { ibl: IBLResult }) {
    return (
        <div className="border border-slate-800 rounded p-3 space-y-2 bg-slate-900/40">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-600 uppercase tracking-wider">IBL</span>

                {/* Posture badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${postureBadge(ibl.posture)}`}>
                    {postureLabel(ibl.posture)}
                </span>

                {/* Confidence */}
                <span className={`text-xs ${ibl.posture_confidence === 'inferred' ? 'text-slate-600 italic' : 'text-slate-500'}`}>
                    {ibl.posture_confidence}
                </span>

                {/* Sequence hint */}
                <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${sequenceBadge(ibl.sequence_hint)}`}>
                    {ibl.sequence_hint}
                </span>

                {/* Sovereignty flag */}
                {ibl.sovereignty_flag && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-900 text-orange-300 border border-orange-700">
                        ⚑ sovereignty flag
                    </span>
                )}
            </div>

            {/* Downstream note */}
            <p className="text-xs text-slate-500 leading-relaxed pl-1 border-l border-slate-700">
                {ibl.downstream_note}
            </p>

            {/* State summary — only if non-neutral */}
            {!ibl.state_summary.toLowerCase().includes('neutral') && (
                <p className="text-xs text-slate-600 italic">{ibl.state_summary}</p>
            )}

            {/* Sovereignty note — only if flagged */}
            {ibl.sovereignty_flag && (
                <p className="text-xs text-orange-400/70 italic">{ibl.sovereignty_note}</p>
            )}
        </div>
    );
}

// ── Report Card ───────────────────────────────────────────────────────────────

function ReportCard({ report, index }: { report: StewardReport; index: number }) {
    const isCanonClean = report.findings.length === 1 && report.findings[0].kind === 'CANON_CLEAN';

    return (
        <div className={`rounded-lg border ${isCanonClean ? 'border-emerald-800/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/50'}`}>

            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-600">#{index === 0 ? 'latest' : index}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${report.role === 'ai' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-700 text-slate-300'}`}>
                    {report.role.toUpperCase()}
                </span>
                {isCanonClean
                    ? <span className="text-emerald-500 font-medium">✓ CANON CLEAN</span>
                    : <span className="text-red-400">{report.findings.filter(f => f.kind !== 'CANON_CLEAN').length} finding{report.findings.filter(f => f.kind !== 'CANON_CLEAN').length !== 1 ? 's' : ''}</span>
                }
                {report.gated_signal && (
                    <span className="text-slate-600">
                        ICG: <span className="text-slate-400">{report.gated_signal.affect_type}</span>
                        {' · '}<span className="text-slate-500">{report.gated_signal.virtue}</span>
                        {' · '}<span className="text-slate-600">coherence {report.gated_signal.coherence_score.toFixed(2)}</span>
                    </span>
                )}
                <span className="ml-auto text-slate-700">
                    {new Date(report.timestamp).toLocaleTimeString()}
                </span>
            </div>

            <div className="p-4 space-y-4">

                {/* IBL — Intent Boundary Layer */}
                <IBLPanel ibl={report.ibl_result} />

                {/* Findings */}
                {!isCanonClean && (
                    <div>
                        <div className="text-xs text-slate-600 uppercase tracking-wider mb-2">Findings</div>
                        <div className="space-y-2">
                            {report.findings.map((f, i) => (
                                <div key={i} className={`border rounded p-2.5 text-xs ${severityColor(f.severity)}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${severityBadge(f.severity)}`}>
                                            {f.severity.toUpperCase()}
                                        </span>
                                        <span className="font-mono text-slate-300">{f.kind}</span>
                                        {f.virtue && <span className="text-slate-500">· {f.virtue}</span>}
                                        {f.word && <span className="text-slate-400 italic">"{f.word}"</span>}
                                    </div>
                                    <p className="text-slate-400 leading-relaxed">{f.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Conscience outputs */}
                {report.conscience.length > 0 && (
                    <div>
                        <div className="text-xs text-slate-600 uppercase tracking-wider mb-2">Conscience</div>
                        <div className="space-y-3">
                            {report.conscience.map((c, i) => (
                                <div key={i} className="border border-slate-700 rounded p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${sequenceBadge(c.sequence)}`}>
                                            {c.sequence}
                                        </span>
                                        <span className="text-xs font-mono text-slate-500">{c.finding_kind}</span>
                                        {c.virtue && <span className="text-xs text-slate-600">· {c.virtue}</span>}
                                    </div>

                                    {/* Steps */}
                                    <div className="space-y-1.5 pl-2 border-l border-slate-800">
                                        {c.steps.map((step, si) => (
                                            <div key={si} className="text-xs">
                                                <span className="text-slate-600 font-mono w-20 inline-block">{step.step}</span>
                                                <span className="text-slate-400 leading-relaxed">{step.content}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Post — the conscience speaking */}
                                    <div className="bg-slate-800/50 rounded p-2.5 text-xs text-slate-300 leading-relaxed border-l-2 border-indigo-600">
                                        <span className="text-indigo-500 text-xs uppercase tracking-wider mr-2">Post</span>
                                        {c.post}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
