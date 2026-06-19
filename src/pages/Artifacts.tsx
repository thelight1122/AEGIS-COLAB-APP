import { useState, useMemo } from 'react';
import {
    Archive, FileEdit, Clock, ChevronRight,
    PlayCircle, ArrowRight, Activity, Users,
    Shield, Cpu, AlertCircle, Trash2, CheckCircle,
    User, ListFilter, Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import {
    loadSessions,
    saveSessions,
    createSession,
    startSession
} from '../core/sessions/sessionStore';
import type { Session as LiveSession } from '../core/sessions/types';
import type { GovernanceEvent } from '../core/governance/types';

function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'outline'; className?: string }) {
    return (
        <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap",
            variant === 'default' ? "bg-primary text-primary-foreground border-transparent" : "bg-muted/50 text-muted-foreground border-border",
            className
        )}>
            {children}
        </span>
    );
}

interface ArtifactGroup {
    artifactId: string;
    sessions: LiveSession[];
    latestSession: LiveSession;
    activeSession: LiveSession | null;
    totalEvents: number;
    participantCount: number;
    lastActivityTimestamp: number;
}

export default function Artifacts() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<LiveSession[]>(() => {
        const raw = loadSessions();
        // Remove old mock data if present
        const mockIds = ['v1', 'v2', 'v3', 'v4', 's1', 's2', 's3'];
        const clean = raw.filter(s => !mockIds.includes(s.id) && !s.id.startsWith('MOCK-'));
        if (clean.length !== raw.length) saveSessions(clean);
        return clean;
    });

    const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

    const artifactGroups = useMemo<ArtifactGroup[]>(() => {
        const groups: Record<string, LiveSession[]> = {};
        sessions.forEach(s => {
            if (!groups[s.artifactId]) groups[s.artifactId] = [];
            groups[s.artifactId].push(s);
        });

        const result = Object.entries(groups).map(([artifactId, groupSessions]) => {
            const sorted = [...groupSessions].sort((a, b) =>
                (b.lastActiveAt || b.startedAt || 0) - (a.lastActiveAt || a.startedAt || 0)
            );

            // Calculate unique participants across all sessions of this artifact
            const uniqueParticipants = new Set<string>();
            groupSessions.forEach(s => {
                s.participants.forEach(p => uniqueParticipants.add(p));
            });

            return {
                artifactId,
                sessions: groupSessions,
                latestSession: sorted[0],
                activeSession: groupSessions.find(s => s.status === 'Active') || null,
                totalEvents: groupSessions.reduce((acc, curr) => acc + curr.eventLog.length, 0),
                participantCount: uniqueParticipants.size,
                lastActivityTimestamp: sorted[0].lastActiveAt || sorted[0].startedAt || 0
            };
        });

        return result.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp);
    }, [sessions]);

    const effectiveSelectedId = selectedArtifactId || artifactGroups[0]?.artifactId || null;

    const selectedGroup = useMemo(
        () => artifactGroups.find(g => g.artifactId === effectiveSelectedId) || null,
        [effectiveSelectedId, artifactGroups]
    );

    const handleStartSession = (artifactId: string) => {
        const { sessions: nextSessions, session: draft } = createSession(sessions, artifactId);
        const { sessions: finalSessions, session: active } = startSession(nextSessions, draft.id);
        saveSessions(finalSessions);
        setSessions(finalSessions);
        navigate('/chamber', { state: { sessionId: active.id } });
    };

    const handleJoinSession = (sessionId: string) => {
        navigate('/chamber', { state: { sessionId } });
    };

    return (
        <div className="h-full bg-background flex flex-col font-display">
            <main className="flex-1 overflow-hidden flex flex-col">
                {artifactGroups.length > 0 ? (
                    <div className="flex flex-1 h-full overflow-hidden">
                        {/* Artifact List (Sidebar) */}
                        <aside className="w-80 border-r border-border bg-muted/10 flex flex-col">
                            <div className="p-6 border-b border-border bg-background">
                                <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                                    <Archive className="w-5 h-5 text-primary" />
                                    Artifact Matrix
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1 font-medium">Deliberation Trajectories</p>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-3">
                                    {artifactGroups.map((group) => {
                                        const isActive = group.activeSession !== null;
                                        const isSelected = group.artifactId === effectiveSelectedId;
                                        return (
                                            <button
                                                key={group.artifactId}
                                                onClick={() => setSelectedArtifactId(group.artifactId)}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-xl border-2 transition-all group relative overflow-hidden",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-md"
                                                        : "border-transparent bg-background hover:border-primary/20 hover:shadow-sm"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <Badge
                                                        variant={isActive ? "default" : "outline"}
                                                        className={cn(
                                                            "text-[9px] uppercase tracking-widest font-black",
                                                            isActive ? "bg-[#197fe6]" : "text-muted-foreground border-border"
                                                        )}
                                                    >
                                                        {isActive ? "ACTIVE" : group.latestSession.status}
                                                    </Badge>
                                                    <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase">
                                                        {group.lastActivityTimestamp ? new Date(group.lastActivityTimestamp).toLocaleDateString() : 'New'}
                                                    </span>
                                                </div>
                                                <h3 className="font-black text-sm truncate uppercase tracking-tight mb-3">
                                                    {group.artifactId.length > 20 ? group.artifactId.slice(0, 8) + '...' + group.artifactId.slice(-4) : group.artifactId}
                                                </h3>
                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                                                            <Activity className="w-3 h-3" />
                                                            {group.totalEvents}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                                                            <Users className="w-3 h-3" />
                                                            {group.participantCount}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={cn(
                                                        "w-4 h-4 transition-transform",
                                                        isSelected ? "text-primary translate-x-0" : "text-muted-foreground -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                                                    )} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </aside>

                        {/* Artifact Detail (Content) */}
                        <section className="flex-1 bg-background flex flex-col overflow-hidden">
                            {selectedGroup ? (
                                <div className="flex flex-col h-full">
                                    {/* Detail Header */}
                                    <div className="p-8 border-b border-border bg-muted/5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                            <Archive className="w-32 h-32" />
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between gap-4 mb-8">
                                                <div className="space-y-2">
                                                    <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
                                                        {selectedGroup.artifactId}
                                                    </h1>
                                                    <div className="flex items-center gap-6 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Last Pulse: {selectedGroup.lastActivityTimestamp ? new Date(selectedGroup.lastActivityTimestamp).toLocaleString() : 'Just now'}</span>
                                                        <span className="flex items-center gap-1.5 text-primary"><Activity className="w-3.5 h-3.5" /> {selectedGroup.totalEvents} Events</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    {selectedGroup.activeSession ? (
                                                        <Button
                                                            className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-black px-8 h-12 rounded-full shadow-xl shadow-[#197fe6]/20 uppercase tracking-tighter text-sm"
                                                            onClick={() => handleJoinSession(selectedGroup.activeSession!.id)}
                                                        >
                                                            <PlayCircle className="w-4 h-4 mr-2" />
                                                            Join Active Session
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            className="font-black px-8 h-12 rounded-full border-2 uppercase tracking-tighter text-sm"
                                                            onClick={() => handleStartSession(selectedGroup.artifactId)}
                                                        >
                                                            <FileEdit className="w-4 h-4 mr-2" />
                                                            Start New Session
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-6">
                                                <StatCard label="Audit Sessions" value={selectedGroup.sessions.length} icon={<ListFilter className="w-4 h-4" />} />
                                                <StatCard label="Peers Involved" value={selectedGroup.participantCount} icon={<Users className="w-4 h-4" />} />
                                                <StatCard label="Latest Status" value={selectedGroup.activeSession ? "ACTIVE" : selectedGroup.latestSession.status} color={selectedGroup.activeSession ? "text-[#197fe6]" : "text-foreground"} />
                                                <StatCard label="Total Governance" value={selectedGroup.totalEvents} icon={<Shield className="w-4 h-4" />} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Panels */}
                                    <div className="flex-1 flex overflow-hidden">
                                        {/* Sessions Table */}
                                        <div className="w-1/2 border-r border-border flex flex-col">
                                            <div className="px-8 py-4 bg-muted/10 border-b border-border">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Trajectory Registry</h3>
                                            </div>
                                            <ScrollArea className="flex-1">
                                                <div className="p-4">
                                                    <div className="space-y-2">
                                                        {selectedGroup.sessions.map((s) => (
                                                            <div key={s.id} className="p-4 rounded-xl border border-border bg-card hover:bg-muted/5 transition-colors group">
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary uppercase">{s.status}</Badge>
                                                                        <span className="text-[10px] font-mono font-bold text-muted-foreground">ID: {s.id.slice(0, 8)}...</span>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                                                                        {s.startedAt ? new Date(s.startedAt).toLocaleDateString() : 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-end justify-between">
                                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                                                        <div className="text-[9px] font-bold uppercase text-muted-foreground/60">Participants: <span className="text-foreground">{s.participants.length}</span></div>
                                                                        <div className="text-[9px] font-bold uppercase text-muted-foreground/60">Events: <span className="text-foreground">{s.eventLog.length}</span></div>
                                                                        <div className="text-[9px] font-bold uppercase text-muted-foreground/60 col-span-2 truncate">Ref: <span className="text-primary font-mono lowercase">{s.lockedVersionRef || "no-lock"}</span></div>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-3 text-[9px] font-black uppercase tracking-tighter"
                                                                        onClick={() => handleJoinSession(s.id)}
                                                                    >
                                                                        Inspect
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </ScrollArea>
                                        </div>

                                        {/* Governance Event Ledger */}
                                        <div className="w-1/2 flex flex-col bg-muted/5">
                                            <div className="px-8 py-4 bg-muted/10 border-b border-border flex justify-between items-center">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Governance Event Ledger</h3>
                                                <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground font-bold">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    APPEND-ONLY
                                                </div>
                                            </div>
                                            <ScrollArea className="flex-1 px-8">
                                                <div className="py-6 space-y-6">
                                                    {selectedGroup.sessions.flatMap(s => s.eventLog).sort((a, b) => b.timestamp - a.timestamp).map((event, idx) => (
                                                        <EventEntry key={`${event.timestamp}-${idx}`} event={event} />
                                                    ))}
                                                    {selectedGroup.totalEvents === 0 && (
                                                        <div className="py-20 text-center space-y-3">
                                                            <Activity className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No governance events recorded</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                                    <div className="w-24 h-24 rounded-full border-4 border-dashed border-muted-foreground/10 flex items-center justify-center mb-6">
                                        <Archive className="w-10 h-10 opacity-20" />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Satellite View Pending</h3>
                                    <p className="text-sm font-medium opacity-50 max-w-xs uppercase tracking-tight">Select an artifact from the matrix to view its deliberation trajectory and audit trail.</p>
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-20 gap-8 text-center animate-in fade-in zoom-in duration-500">
                        <div className="p-12 rounded-full bg-primary/5 ring-[32px] ring-primary/[0.01] border border-primary/10 shadow-2xl relative">
                            <Archive className="w-24 h-24 text-primary opacity-20" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-12 h-12 text-primary opacity-40 animate-pulse" />
                            </div>
                        </div>
                        <div className="max-w-md space-y-4">
                            <h3 className="text-5xl font-black uppercase tracking-tighter">Archive Empty</h3>
                            <p className="text-muted-foreground leading-relaxed text-lg font-medium opacity-80 uppercase tracking-tight">
                                Artifacts appear after you create sessions in the Commons Workshop. Your deliberation trajectories will be mapped here.
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white shadow-2xl shadow-[#197fe6]/30 px-16 h-20 rounded-full text-2xl font-black uppercase tracking-tighter gap-4 transition-all hover:scale-105 active:scale-95"
                            onClick={() => navigate('/chamber')}
                        >
                            Enter Commons Workshop
                            <ArrowRight className="w-8 h-8" />
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}

function StatCard({ label, value, icon, color = "text-foreground" }: { label: string; value: number | string; icon?: React.ReactNode; color?: string }) {
    return (
        <div className="bg-background border border-border p-5 rounded-2xl shadow-sm group hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] uppercase font-black tracking-[0.15em] text-muted-foreground">{label}</div>
                {icon && <div className="text-muted-foreground/50 group-hover:text-primary transition-colors">{icon}</div>}
            </div>
            <div className={cn("text-3xl font-black tabular-nums transition-transform group-hover:translate-x-1", color)}>{value}</div>
        </div>
    );
}

function EventEntry({ event }: { event: GovernanceEvent }) {
    const renderSummary = () => {
        switch (event.type) {
            case "AWARENESS_ACK":
                return <span>Acknowledged awareness</span>;
            case "CONTRIBUTION":
                return <span>Contribution via lens <span className="font-mono text-primary">{event.lensId || '—'}</span></span>;
            case "PROXY_REVIEW":
                return <span>Proxy review via lens <span className="font-mono text-primary">{event.lensId}</span></span>;
            case "DEFER_LENS":
            case "lens_deferral_with_rationale":
                return <span>Lens deferred: <span className="font-mono text-primary">{event.lensId}</span></span>;
            case "LOCK_REQUEST":
                return <span className="text-green-600 font-bold uppercase tracking-tight">Lock Requested</span>;
            case "AI_CHAT_REQUESTED":
                return <span>AI request: <span className="font-mono text-primary uppercase">{event.provider}/{event.model}</span></span>;
            case "AI_CHAT_COMPLETED":
                return <span className="text-green-600 font-bold uppercase tracking-tight">AI response completed</span>;
            case "AI_CHAT_FAILED":
                return <span className="text-red-500 font-bold uppercase tracking-tight">AI request failed</span>;
            case "SESSION_CLEARED":
                return <span className="text-orange-500 font-bold uppercase tracking-tight">Session cleared</span>;
            default: {
                // Handle exhaustive check
                const _exhaustiveCheck: never = event;
                return <span>Unknown event: {(_exhaustiveCheck as { type: string }).type}</span>;
            }
        }
    };

    const getIcon = () => {
        switch (event.type) {
            case "AWARENESS_ACK": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
            case "CONTRIBUTION": return <FileEdit className="w-3.5 h-3.5 text-blue-500" />;
            case "PROXY_REVIEW": return <Users className="w-3.5 h-3.5 text-purple-500" />;
            case "DEFER_LENS":
            case "lens_deferral_with_rationale": return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
            case "LOCK_REQUEST": return <Lock className="w-3.5 h-3.5 text-green-600" />;
            case "AI_CHAT_REQUESTED": return <Cpu className="w-3.5 h-3.5 text-primary" />;
            case "AI_CHAT_COMPLETED": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
            case "AI_CHAT_FAILED": return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
            case "SESSION_CLEARED": return <Trash2 className="w-3.5 h-3.5 text-orange-500" />;
            default: return <Activity className="w-3.5 h-3.5" />;
        }
    };

    // Helper to extract peer ID if it exists on the event variant
    const getEventPeerId = (): string | null => {
        if ('peerId' in event) return event.peerId;
        return null;
    };

    const eventPeerId = getEventPeerId();
    // Stable pseudo-hash based on timestamp for UI aesthetic
    const stableHash = event.timestamp.toString(36).toUpperCase().padStart(8, '0');

    return (
        <div className="flex gap-4 group">
            <div className="flex flex-col items-center">
                <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                    {getIcon()}
                </div>
                <div className="w-px flex-1 bg-border mt-2 group-last:hidden" />
            </div>
            <div className="pb-8 flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-black text-muted-foreground/40 uppercase tracking-widest">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    {eventPeerId && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50 border border-border">
                            <User className="w-2.5 h-2.5 text-muted-foreground" />
                            <span className="text-[9px] font-black uppercase text-muted-foreground">{eventPeerId}</span>
                        </div>
                    )}
                </div>
                <div className="text-xs font-black uppercase tracking-tight text-foreground/80 leading-snug">
                    {renderSummary()}
                </div>
                {/* Securely hide sensitive payload by default */}
                <div className="mt-1 text-[9px] font-mono text-muted-foreground/50 truncate">
                    HASH: {stableHash} // DATA CONCEALED
                </div>
            </div>
        </div>
    );
}
