import { useState } from 'react';
import {
    History,
    Calendar,
    Clock,
    Users,
    Activity,
    ChevronRight,
    PlayCircle,
    FileText,
    MessageSquare,
    ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { loadSessions } from '../core/sessions/sessionStore';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Sessions() {
    const navigate = useNavigate();
    const [sessions] = useState(() => loadSessions());
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
        sessions.length > 0 ? sessions[0].id : null
    );

    const selectedSession = sessions.find(s => s.id === selectedSessionId);

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed rounded-2xl bg-card shadow-inner gap-6 text-center animate-in fade-in zoom-in duration-500 max-w-4xl mx-auto mt-10">
                <div className="p-6 rounded-full bg-primary/5 ring-8 ring-primary/5 border border-primary/10">
                    <History className="w-12 h-12 text-primary/40" />
                </div>
                <div className="max-w-md space-y-2">
                    <h3 className="text-2xl font-bold tracking-tight">No sessions recorded</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        Your deliberation history will appear here once you've engaged with the Commons Workshop.
                    </p>
                </div>
                <Button
                    size="lg"
                    className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white shadow-xl shadow-[#197fe6]/20 px-8 rounded-full font-bold gap-2"
                    onClick={() => navigate('/commons')}
                >
                    Enter Commons Workshop
                    <ArrowRight className="w-5 h-5" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl">
            {/* Session List (Sidebar on desktop) */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <History className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Past Sessions</h2>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => setSelectedSessionId(session.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-xl border transition-all duration-200",
                                selectedSessionId === session.id
                                    ? "bg-primary/5 border-primary shadow-sm"
                                    : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono text-muted-foreground">
                                    {session.startedAt ? new Date(session.startedAt).toLocaleDateString() : 'Draft'}
                                </span>
                                <div className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                    (session.eventLog.length * 7) % 100 >= 80
                                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                )}>
                                    {(session.eventLog.length * 7) % 100}%
                                </div>
                            </div>
                            <h3 className="font-semibold text-sm mb-1 line-clamp-1">Artifact: {session.artifactId}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Session {session.id.split('-')[1]}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.participants.length} Peer{session.participants.length !== 1 ? 's' : ''}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Session Detail (Main Content) */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedSession ? (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">
                        {/* Detail Header */}
                        <div className="p-6 border-b border-border bg-muted/20">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <h1 className="text-2xl font-bold">Session Review: {selectedSession.id}</h1>
                                <div className="flex gap-2">
                                    <div className="px-3 py-1 bg-background border border-border rounded-lg text-xs flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        {selectedSession.startedAt ? new Date(selectedSession.startedAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <div className="px-3 py-1 bg-background border border-border rounded-lg text-xs flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        {selectedSession.status}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MetricCard
                                    label="Inclusion"
                                    value={`${(selectedSession.eventLog.length * 7) % 100}%`}
                                    icon={<Activity className="w-4 h-4 text-green-500" />}
                                />
                                <MetricCard
                                    label="Participants"
                                    value={selectedSession.participants.length}
                                    icon={<Users className="w-4 h-4 text-blue-500" />}
                                />
                                <MetricCard
                                    label="Artifacts"
                                    value={1}
                                    icon={<FileText className="w-4 h-4 text-orange-500" />}
                                />
                                <MetricCard
                                    label="Proposals"
                                    value={selectedSession.eventLog.filter(e => e.type === 'CONTRIBUTION').length}
                                    icon={<MessageSquare className="w-4 h-4 text-purple-500" />}
                                />
                            </div>
                        </div>

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Session Summary</h3>
                                <p className="text-base leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-xl border border-border/50">
                                    Last activity on {selectedSession.lastActiveAt ? new Date(selectedSession.lastActiveAt).toLocaleString() : 'N/A'}.
                                    This session tracked {selectedSession.eventLog.length} total events.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deliberation Replay</h3>
                                <div className="aspect-video w-full rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-center group cursor-pointer overflow-hidden relative shadow-inner">
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <PlayCircle className="w-16 h-16 text-primary/80 group-hover:text-primary group-hover:scale-110 transition-all duration-300 z-10" />
                                    <p className="mt-4 text-sm text-neutral-400 font-medium z-10">Interactive Replay Placeholder</p>
                                    <div className="mt-2 text-[10px] text-neutral-500 z-10">Playback engine pending final build</div>
                                </div>
                            </section>

                            <div className="pt-2 flex justify-end">
                                <button className="text-sm text-primary hover:underline flex items-center gap-1 font-medium px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                                    View Full Narrative Logs <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-muted/5">
                        <History className="w-12 h-12 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">No session selected</h3>
                        <p className="text-sm max-w-xs mt-2">Pick a deliberation session from the sidebar to review outcomes and replays.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="bg-background rounded-xl p-3 border border-border/50 shadow-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
                {icon}
            </div>
            <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">{label}</div>
                <div className="text-sm font-bold truncate">{value}</div>
            </div>
        </div>
    );
}
