import { Activity, Lock, PieChart, CheckCircle2, Circle, Zap, MinusCircle, Users, ShieldCheck } from 'lucide-react';
import { type TelemetryData, type Peer, LOCK_INCLUSION_THRESHOLD } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

import { useState, useRef, useLayoutEffect } from 'react';

interface TelemetryPanelProps {
    telemetry: TelemetryData;
    peers: Peer[];
    onInvokeLens: (lensName: string) => void;
    onDeferLens: (lensName: string, rationale?: string) => void;
    onAcknowledge: (peerId: string) => void;
    onLockVersion: () => void;
}

export function TelemetryPanel({ telemetry, peers, onInvokeLens, onDeferLens, onAcknowledge, onLockVersion }: TelemetryPanelProps) {
    const { inclusionScore, drift, lenses, lockAvailable } = telemetry;
    const [deferringLens, setDeferringLens] = useState<string | null>(null);
    const [rationale, setRationale] = useState('');
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
