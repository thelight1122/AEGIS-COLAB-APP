import { Activity, Lock, PieChart, CheckCircle2, Circle, Zap, MinusCircle, Users, ShieldCheck } from 'lucide-react';
import { type TelemetryData, type Peer, LOCK_INCLUSION_THRESHOLD } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

import { useState } from 'react';

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

    const activeLenses = lenses.filter((l) => l.status === 'active');
    const missingLenses = lenses.filter((l) => l.status === 'missing');
    const deferredLenses = lenses.filter((l) => l.status === 'deferred');

    const allAcknowledged = peers.length > 0 && peers.every((p) => p.acknowledged);
    const inclusionMet = inclusionScore >= LOCK_INCLUSION_THRESHOLD;

    const handleDeferSubmit = (lensName: string) => {
        onDeferLens(lensName, rationale);
        setDeferringLens(null);
        setRationale('');
    };

    return (
        <div className="h-full bg-card border-l border-border flex flex-col p-4 space-y-5 overflow-y-auto">
            {/* Header */}
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Coherence Telemetry
            </h3>

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
                    <div
                        className={cn("h-full transition-all duration-500 w-[var(--pw)]", inclusionMet ? "bg-green-500" : "bg-yellow-500")}
                        style={{ '--pw': `${inclusionScore}%` } as React.CSSProperties}
                    />
                </div>
                {!inclusionMet && (
                    <p className="text-[10px] text-muted-foreground">Needs ≥{LOCK_INCLUSION_THRESHOLD}% for lock</p>
                )}
            </div>

            {/* Drift Indicator */}
            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span>Drift Signal</span>
                    <span className={cn("font-medium", drift < 10 ? "text-green-500" : "text-red-500")}>
                        {drift}%
                    </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-500 w-[var(--pw)]", drift < 10 ? "bg-green-500" : "bg-red-500")}
                        style={{ '--pw': `${drift}%` } as React.CSSProperties}
                    />
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
                                        <textarea
                                            className="text-[10px] bg-background border border-border rounded p-1.5 min-h-[40px] focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="Reason for deferral (optional)..."
                                            value={rationale}
                                            onChange={(e) => setRationale(e.target.value)}
                                            data-testid="defer-rationale"
                                        />
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setDeferringLens(null)}>Cancel</Button>
                                            <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleDeferSubmit(lens.name)} data-testid="confirm-defer">Save</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lock Button */}
            <div className="pt-3 border-t border-border mt-auto">
                {lockAvailable ? (
                    <button
                        className="w-full py-2.5 px-4 rounded-md flex items-center justify-center gap-2 font-medium transition-all text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm animate-in fade-in zoom-in duration-300"
                        onClick={onLockVersion}
                        id="lock-version-button"
                        data-testid="lock-button"
                    >
                        <Lock className="w-4 h-4" />
                        Lock Version
                    </button>
                ) : (
                    <div className="space-y-0.5 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-2 mb-2 font-semibold uppercase tracking-tighter opacity-70">
                            <Activity className="w-3 h-3" />
                            Convergence Pending
                        </div>
                        {!allAcknowledged && <p>• Waiting for peer acknowledgments</p>}
                        {missingLenses.length > 0 && <p>• Missing lens coverage ({missingLenses.length})</p>}
                        {!inclusionMet && <p>• Inclusion below {LOCK_INCLUSION_THRESHOLD}%</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
