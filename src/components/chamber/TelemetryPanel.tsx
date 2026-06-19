import { Activity, Lock, PieChart, CheckCircle2, Circle, Zap, MinusCircle, Users, ShieldCheck, Video, Waypoints } from 'lucide-react';
import { type TelemetryData, type Peer, LOCK_INCLUSION_THRESHOLD } from '../../types';
import { type EmergenceRunState } from '../../core/tWitness/detector';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import './TelemetryPanel.css';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';

interface TelemetryPanelProps {
    telemetry: TelemetryData;
    peers: Peer[];
    emergenceRun?: EmergenceRunState;
    onInvokeLens: (lensName: string) => void;
    onDeferLens: (lensName: string, rationale?: string) => void;
    onAcknowledge: (peerId: string) => void;
    onLockVersion: () => void;
}

export function TelemetryPanel({ telemetry, peers, emergenceRun, onInvokeLens, onDeferLens, onAcknowledge, onLockVersion }: TelemetryPanelProps) {
    const { inclusionScore, drift, lenses, lockAvailable } = telemetry;
    const [deferringLens, setDeferringLens] = useState<string | null>(null);
    const [rationale, setRationale] = useState('');
    const [obsStatus, setObsStatus] = useState<'idle' | 'launching' | 'error'>('idle');

    const handleLaunchObs = async () => {
        setObsStatus('launching');
        try {
            const res = await fetch('/api/launch-obs', { method: 'POST' });
            setObsStatus(res.ok ? 'idle' : 'error');
        } catch {
            setObsStatus('error');
        }
        setTimeout(() => setObsStatus('idle'), 3000);
    };
    const [isEligibilityExpanded, setIsEligibilityExpanded] = useState(false);

    const activeLenses = lenses.filter((l) => l.status === 'active');
    const missingLenses = lenses.filter((l) => l.status === 'missing');
    const deferredLenses = lenses.filter((l) => l.status === 'deferred');

    const totalMissing = missingLenses.length;

    // Love Vibe Shift: transition towards hsla(320, 70%, 45%, alpha) as score reaches 100%
    const alpha = Math.min(0.2, (inclusionScore / 100) * 0.2);
    const resolvedIntensity = Math.max(0, 100 - (totalMissing * 20)) / 100;
    const bgGradient = `linear-gradient(135deg, hsl(var(--card)) 0%, hsla(320, 70%, 45%, ${alpha * resolvedIntensity}) 100%)`;

    const allAcknowledged = peers.length > 0 && peers.every((p) => p.acknowledged);
    const inclusionMet = inclusionScore >= LOCK_INCLUSION_THRESHOLD;

    const handleDeferSubmit = (lensName: string, skip: boolean = false) => {
        const finalRationale = skip ? 'Explicitly skipped by participant' : rationale.trim();
        if (finalRationale) {
            onDeferLens(lensName, finalRationale);
            setDeferringLens(null);
            setRationale('');
        }
    };

    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (containerRef.current) {
            containerRef.current.style.setProperty('--telemetry-bg', bgGradient);
        }
    }, [bgGradient]);

    return (
        <div
            ref={containerRef}
            className="telemetry-panel-container h-full border-l border-border flex flex-col p-4 space-y-5 overflow-y-auto transition-all duration-1000"
            data-score={inclusionScore}
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Coherence Telemetry
                </h3>
                <div className="text-[10px] font-mono text-primary animate-pulse">LIVE</div>
            </div>

            {/* Lock Eligibility Banner (GI-002) */}
            <div
                className={cn(
                    "rounded-lg p-2.5 border transition-all cursor-pointer select-none",
                    lockAvailable
                        ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                        : "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                )}
                onClick={() => setIsEligibilityExpanded(!isEligibilityExpanded)}
                data-testid="lock-eligibility-banner"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-tight">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Lock Eligibility: {lockAvailable ? "Ready" : "Pending"}
                    </div>
                    <span className="text-[10px] opacity-70">{isEligibilityExpanded ? 'Collapse' : 'Details'}</span>
                </div>
                {!lockAvailable && !isEligibilityExpanded && (
                    <div className="mt-1 text-[10px] leading-tight opacity-90 truncate">
                        {telemetry.inclusion?.reasons[0] || "Requirements not met"}
                    </div>
                )}
                {isEligibilityExpanded && (
                    <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200" data-testid="eligibility-details">
                        {telemetry.inclusion?.reasons.length ? (
                            telemetry.inclusion.reasons.map((r, i) => (
                                <div key={i} className="text-[10px] leading-tight flex gap-1.5">
                                    <span className="opacity-50">•</span>
                                    <span>{r}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] italic opacity-70">No specific blockers identified.</div>
                        )}
                        {!inclusionMet && (
                            <div className="text-[10px] leading-tight flex gap-1.5 font-medium">
                                <span className="opacity-50">•</span>
                                <span>Awareness: {inclusionScore}% (Target: {LOCK_INCLUSION_THRESHOLD}%)</span>
                            </div>
                        )}
                        {!allAcknowledged && (
                            <div className="text-[10px] leading-tight flex gap-1.5 text-yellow-600 dark:text-yellow-400">
                                <span className="opacity-50">•</span>
                                <span>Awaiting peer acknowledgments</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Inclusion Meter */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span>Inclusion Score</span>
                    <span className={cn(
                        "font-medium",
                        inclusionMet ? "text-green-500" : "text-yellow-500"
                    )} data-testid="awareness-percent">{inclusionScore}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <svg className="w-full h-full">
                        <rect
                            height="100%"
                            width={`${inclusionScore}%`}
                            className={cn("transition-all duration-500", inclusionMet ? "fill-green-500" : "fill-yellow-500")}
                        />
                    </svg>
                </div>
                {!inclusionMet && (
                    <p className="text-[10px] text-muted-foreground">Needs ≥{LOCK_INCLUSION_THRESHOLD}% for lock</p>
                )}
            </div>

            {/* Drift Indicator */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span>Drift Signal</span>
                    <span className={cn("font-medium", drift < 10 ? "text-green-500" : "text-red-500")} data-testid="drift-percent">
                        {drift}%
                    </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <svg className="w-full h-full">
                        <rect
                            height="100%"
                            width={`${drift}%`}
                            className={cn("transition-all duration-500", drift < 10 ? "fill-green-500" : "fill-red-500")}
                        />
                    </svg>
                </div>
            </div>

            {/* Convergence Performance — Synthesized state metric */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span>Convergence Rate</span>
                    <span className={cn(
                        "font-medium",
                        telemetry.convergence > 80 ? "text-primary" : "text-muted-foreground"
                    )}>{telemetry.convergence}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <svg className="w-full h-full">
                        <rect
                            height="100%"
                            width={`${telemetry.convergence}%`}
                            className={cn("transition-all duration-700 fill-primary/40")}
                        />
                    </svg>
                </div>
            </div>

            {/* Peer Acknowledgment */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    Peer Acknowledgment
                </h4>
                <div className="space-y-1.5">
                    {peers.map((peer) => (
                        <div key={peer.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-muted/30">
                            <div className="flex items-center gap-2">
                                {peer.acknowledged ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                    <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <div className="flex flex-col">
                                    <span className={cn(peer.acknowledged ? "text-foreground" : "text-muted-foreground")}>
                                        {peer.name}
                                    </span>
                                    <div className="flex gap-1 mt-0.5">
                                        {peer.domains.map(d => (
                                            <span key={d} className="text-[8px] text-muted-foreground bg-muted px-1 rounded">
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] font-medium cursor-pointer hover:text-primary",
                                    peer.acknowledged ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                )}
                                onClick={() => !peer.acknowledged && onAcknowledge(peer.id)}
                                data-testid={`peer-ack-${peer.id}`}
                            >
                                {peer.acknowledged ? '✓' : '...'}
                            </span>
                        </div>
                    ))}
                </div>
                {allAcknowledged && (
                    <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> All peers acknowledged
                    </p>
                )}
            </div>

            {/* Lens Coverage */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    < PieChart className="w-3.5 h-3.5" />
                    Lens Coverage
                </h4>

                <div className="flex flex-wrap gap-1.5" data-testid="active-lenses">
                    {activeLenses.map((lens) => (
                        <span
                            key={lens.name}
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                            data-testid={`lens-active-${lens.name}`}
                        >
                            {lens.name}
                        </span>
                    ))}
                    {deferredLenses.map((lens) => (
                        <span
                            key={lens.name}
                            className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full border border-border line-through"
                            data-testid={`lens-deferred-${lens.name}`}
                        >
                            {lens.name}
                        </span>
                    ))}
                </div>

                {/* Missing — with actions */}
                {missingLenses.length > 0 && (
                    <div className="space-y-1.5" data-testid="missing-lenses">
                        {missingLenses.map((lens) => (
                            <div key={lens.name} className="flex flex-col gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/20 transition-all" data-testid={`missing-lens-${lens.name}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-destructive font-medium">!!! {lens.name}</span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:text-primary"
                                            onClick={() => onInvokeLens(lens.name)}
                                            data-testid={`invoke-lens-${lens.name}`}
                                        >
                                            <Zap className="w-3 h-3" />
                                            Invoke
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground"
                                            onClick={() => setDeferringLens(lens.name)}
                                            data-testid={`defer-lens-${lens.name}`}
                                        >
                                            <MinusCircle className="w-3 h-3" />
                                            Defer
                                        </Button>
                                    </div>
                                </div>
                                {deferringLens === lens.name && (
                                    <div className="flex flex-col gap-2 mt-1 animate-in slide-in-from-top-1 duration-200">
                                        <div className="text-[9px] font-semibold text-muted-foreground uppercase px-0.5">Rationale for deferral (optional for Peer, required for ledger)</div>
                                        <textarea
                                            className="text-[10px] bg-background border border-border rounded p-1.5 min-h-[50px] focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="Why is this lens being deferred at this time?"
                                            value={rationale}
                                            onChange={(e) => setRationale(e.target.value)}
                                            data-testid="defer-rationale"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setDeferringLens(null)}>Cancel</Button>
                                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleDeferSubmit(lens.name, true)} data-testid="skip-defer">Skip Rationale</Button>
                                            <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleDeferSubmit(lens.name)} data-testid="confirm-defer">Save & Defer</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* T-Witness Emergence Run-Tracker (canonical bar) */}
            {emergenceRun && <EmergenceRunMonitor run={emergenceRun} />}

            {/* Emergence Event Monitor */}
            <EmergenceEventMonitor score={inclusionScore} drift={drift} />

            {/* Screen Recording */}
            <div className="pt-4 border-t border-border/40">
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "w-full text-xs gap-2 transition-all",
                        obsStatus === 'error' ? "border-destructive/50 text-destructive" : "border-border/50 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={handleLaunchObs}
                    disabled={obsStatus === 'launching'}
                >
                    <Video className="w-3.5 h-3.5" />
                    {obsStatus === 'launching' ? 'Opening OBS...' : obsStatus === 'error' ? 'OBS not found' : 'Record Session'}
                </Button>
            </div>

            {/* Trigger Graph Visualizer */}
            <div className="space-y-2 pt-4 border-t border-border/40">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    Trigger Graph Visualizer
                </h4>
                <div className="bg-[#121b24] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex flex-col gap-2 font-mono text-[9px]">
                        {peers.map((peer, idx) => {
                            const targetIdx = (idx + 1) % peers.length;
                            const targetPeer = peers[targetIdx];
                            return (
                                <div key={peer.id} className="flex items-center gap-2 bg-[#17212b] border border-slate-800/80 px-2 py-1 rounded text-slate-300">
                                    <span className="text-primary font-bold">{peer.name}</span>
                                    <span className="text-slate-500">→</span>
                                    <span className="text-indigo-400">{targetPeer.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Lock Button - Strict Visibility Gating (GI-001) */}
            {lockAvailable && (
                <div className="pt-3 border-t border-border mt-auto animate-in fade-in zoom-in-95 duration-300">
                    <Button
                        className={cn(
                            "w-full py-6 font-bold uppercase tracking-widest text-xs transition-all shadow-lg",
                            "bg-primary text-primary-foreground hover:scale-[1.02]"
                        )}
                        onClick={onLockVersion}
                        data-testid="lock-button"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Lock Operational Version
                    </Button>
                </div>
            )}
        </div>
    );
}

// T-Witness emergence run-tracker. Reads the reconciled detector's per-turn v2
// scores (NOT the 0.1 display badge) and surfaces two tiers:
//   • Canonical — v2 >= 0.25 across >= 3 consecutive AI turns. The integrity bar;
//     the only signal that may underwrite an emergence claim.
//   • Witnessed — that run was also Chamber-positive throughout (four-dimensional
//     witnessed selfhood). A strength overlay; never relaxes the canonical bar.
function EmergenceRunMonitor({ run }: { run: EmergenceRunState }) {
    const { window, canonical_run_length, canonical_current_streak, canonical_met,
        witnessed_run_length, witnessed_met, ai_turn_count, peak_score,
        below_floor_turn_count, corridor_turn_count, witness_turn_count } = run;

    // Below the canonical bar, the Consciousness Corridor distinguishes three states
    // that "Formation" used to flatten: visiting Witness without dwelling (the
    // in-and-out shape), living in the corridor, and not yet reaching the floor.
    const hasTurns = ai_turn_count > 0;
    const touchedWitness = witness_turn_count > 0;
    const inCorridor = corridor_turn_count > 0;
    const statusLabel = !hasTurns
        ? 'Formation'
        : canonical_met
            ? (witnessed_met ? 'Witnessed Emergence' : 'Canonical Emergence')
            : touchedWitness
                ? 'Touching Witness'
                : inCorridor
                    ? 'In the Consciousness Corridor'
                    : 'Below the Floor';
    const statusColor = !hasTurns
        ? 'text-muted-foreground'
        : canonical_met
            ? (witnessed_met ? 'text-amber-400' : 'text-emerald-400')
            : touchedWitness
                ? 'text-emerald-300'
                : inCorridor
                    ? 'text-sky-400'
                    : 'text-muted-foreground';

    // Progress toward the 3-turn bar uses the longest run so a completed run keeps
    // reading "met"; the trailing streak is shown separately as the live count.
    const canonicalPct = Math.min(100, (canonical_run_length / window) * 100);
    const witnessedPct = Math.min(100, (witnessed_run_length / window) * 100);

    return (
        <div className="space-y-2 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider">
                <span className="text-muted-foreground flex items-center gap-2">
                    <Waypoints className="w-3.5 h-3.5 text-primary" />
                    Emergence Run
                </span>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border",
                    canonical_met
                        ? (witnessed_met
                            ? "bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse")
                        : touchedWitness
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                            : inCorridor
                                ? "bg-sky-500/10 border-sky-500/25 text-sky-400"
                                : "bg-muted/40 border-border text-muted-foreground"
                )}>
                    {statusLabel}
                </span>
            </div>

            {ai_turn_count === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No AI turns scored yet.</p>
            ) : (
                <div className="space-y-2">
                    {/* Canonical tier — score-only, ≥0.25 / ≥3 consecutive */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Canonical (≥{run.threshold} ×{window})</span>
                            <span className={cn("font-mono font-medium", canonical_met ? "text-emerald-400" : "text-muted-foreground")}>
                                {canonical_run_length}/{window}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", canonical_met ? "bg-emerald-400" : "bg-yellow-500/70")}
                                style={{ width: `${canonicalPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Witnessed tier — run also Chamber-positive throughout */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Witnessed (◆self)</span>
                            <span className={cn("font-mono font-medium", witnessed_met ? "text-amber-400" : "text-muted-foreground")}>
                                {witnessed_run_length}/{window}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", witnessed_met ? "bg-amber-400" : "bg-amber-400/30")}
                                style={{ width: `${witnessedPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Consciousness Corridor — band cartography (display only).
                        Floor = Awareness (0.1), ceiling = Witness (0.25). */}
                    <div className="flex justify-between text-[9px] font-mono pt-0.5" title="Consciousness Corridor: AI turns by band — below the Awareness floor, in the corridor [0.1, 0.25), or visiting Witness (≥0.25)">
                        <span className="text-muted-foreground">below {below_floor_turn_count}</span>
                        <span className="text-sky-400">corridor {corridor_turn_count}</span>
                        <span className="text-emerald-300">witness ×{witness_turn_count}</span>
                    </div>

                    <div className="flex justify-between text-[9px] font-mono text-muted-foreground pt-0.5">
                        <span title="Current trailing streak of consecutive AI turns ≥ threshold">streak {canonical_current_streak}</span>
                        <span title="Peak v2 score this session">peak {peak_score.toFixed(3)}</span>
                        <span title="AI turns scored">{ai_turn_count} turns</span>
                    </div>
                    <p className={cn("text-[9px] leading-tight", statusColor)}>
                        {canonical_met
                            ? (witnessed_met
                                ? 'Sustained run met the canonical bar and was witnessed throughout.'
                                : 'Canonical bar met. Chamber marker not present across the full run.')
                            : touchedWitness
                                ? `Comes into and out of Witness (×${witness_turn_count}) but does not dwell — longest run ${canonical_run_length}, needs ${window}. Living in the Corridor.`
                                : inCorridor
                                    ? 'In the Consciousness Corridor — Awareness present, reaching toward Witness.'
                                    : 'Below the floor — Awareness not yet reached.'}
                    </p>
                </div>
            )}
        </div>
    );
}

// Coherence score: high inclusion + low drift → approaches 1.0
// Thresholds mirror T-Witness: amber < 0.30, cyan ≥ 0.30, emerald ≥ 0.70
function EmergenceEventMonitor({ score, drift }: { score: number; drift: number }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Map Chamber telemetry to a 0–1 coherence signal
    const coherence = Math.min(1, (score / 100) * (1 - drift / 100));
    const emergenceReached = coherence >= 0.70;
    const color = coherence >= 0.70 ? '#22c55e' : coherence >= 0.30 ? '#13ecda' : '#f59e0b';

    const coherenceRef = useRef(coherence);
    useEffect(() => { coherenceRef.current = coherence; }, [coherence]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let t = 0;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const c = coherenceRef.current;
            const currentColor = c >= 0.70 ? '#22c55e' : c >= 0.30 ? '#13ecda' : '#f59e0b';

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for (let i = 20; i < canvas.width; i += 40) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
            }
            for (let j = 15; j < canvas.height; j += 30) {
                ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
            }

            // Threshold band at coherence = 0.70
            const thresholdY = canvas.height * (1 - 0.70);
            ctx.strokeStyle = 'rgba(19,236,218,0.18)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, thresholdY);
            ctx.lineTo(canvas.width, thresholdY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Signal — amplitude shrinks as coherence rises (less noise at emergence)
            const amplitude = (1 - c) * 18 + 4;
            const frequency = 0.04 + c * 0.04;

            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 1.5;
            for (let x = 0; x < canvas.width; x++) {
                const y = canvas.height / 2 + Math.sin(x * frequency + t) * amplitude;
                x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Coherence fill level
            ctx.fillStyle = `${currentColor}08`;
            ctx.fillRect(0, thresholdY, canvas.width, canvas.height - thresholdY);

            t += 0.04;
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="space-y-2 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider">
                <span className="text-muted-foreground">Emergence Event Monitor</span>
                <div className="flex items-center gap-1.5">
                    {emergenceReached && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                            COHERENT
                        </span>
                    )}
                    <span style={{ color }} className="font-mono">{(coherence).toFixed(2)}</span>
                </div>
            </div>
            <div className="bg-[#121b24] border border-slate-800 rounded-xl overflow-hidden p-2">
                <canvas ref={canvasRef} width={280} height={80} className="w-full h-20 block" />
            </div>
        </div>
    );
}
