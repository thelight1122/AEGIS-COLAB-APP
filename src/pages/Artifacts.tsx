import { useState, useMemo } from 'react';
import {
    Archive, Lock, FileEdit, Clock, ChevronRight,
    CheckCircle2, XCircle, CircleDot,
    ThumbsUp, ThumbsDown, MinusCircle, PlayCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
    MOCK_VERSIONS, MOCK_PROPOSALS, MOCK_CONSIDERATIONS, MOCK_PEERS,
} from '../types';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';

const statusConfig = {
    locked: { color: 'text-green-500 bg-green-500/10 border-green-500/30', icon: Lock, label: 'Locked' },
    draft: { color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', icon: FileEdit, label: 'Draft' },
    archived: { color: 'text-muted-foreground bg-muted/50 border-border', icon: Archive, label: 'Archived' },
};

const proposalStatusConfig = {
    accepted: { color: 'text-green-600 dark:text-green-400', icon: CheckCircle2, bg: 'bg-green-500/10 border-green-500/20' },
    rejected: { color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10 border-red-500/20' },
    pending: { color: 'text-yellow-500', icon: CircleDot, bg: 'bg-yellow-500/10 border-yellow-500/20' },
};

const verdictConfig = {
    support: { color: 'text-green-600 dark:text-green-400', icon: ThumbsUp, bg: 'bg-green-500/10' },
    oppose: { color: 'text-red-500', icon: ThumbsDown, bg: 'bg-red-500/10' },
    abstain: { color: 'text-muted-foreground', icon: MinusCircle, bg: 'bg-muted/50' },
};

import { useNavigate } from 'react-router-dom';
import {
    loadSessions,
    saveSessions,
    createSession,
    startSession,
    getActiveSessionForArtifact
} from '../core/sessions/sessionStore';
import type { Session as LiveSession } from '../core/sessions/types';

export default function Artifacts() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<LiveSession[]>(() => loadSessions());
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
        MOCK_VERSIONS.length > 0
            ? (MOCK_VERSIONS[MOCK_VERSIONS.length - 2]?.id || MOCK_VERSIONS[0].id)
            : null
    );
    const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

    const handleStartSession = (artifactId: string) => {
        const { sessions: nextSessions, session: draft } = createSession(sessions, artifactId);
        const { sessions: finalSessions, session: active } = startSession(nextSessions, draft.id);
        saveSessions(finalSessions);
        setSessions(finalSessions);
        navigate('/', { state: { sessionId: active.id } });
    };

    const handleJoinSession = (sessionId: string) => {
        navigate('/', { state: { sessionId } });
    };

    const selectedVersion = useMemo(
        () => MOCK_VERSIONS.find((v) => v.id === selectedVersionId) || null,
        [selectedVersionId]
    );

    const proposals = useMemo(
        () => MOCK_PROPOSALS.filter((p) => p.versionId === selectedVersionId),
        [selectedVersionId]
    );

    const considerations = useMemo(
        () => selectedProposalId
            ? MOCK_CONSIDERATIONS.filter((c) => c.proposalId === selectedProposalId)
            : MOCK_CONSIDERATIONS.filter((c) => proposals.some((p) => p.id === c.proposalId)),
        [selectedProposalId, proposals]
    );

    return (
        <div className="space-y-8 max-w-6xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Archive className="w-6 h-6" />
                    Artifacts Archive
                </h2>
                <p className="text-muted-foreground mt-1">
                    Browse version history, review proposals, and audit peer considerations.
                </p>
            </div>

            {/* Version Timeline */}
            <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Version Timeline
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {MOCK_VERSIONS.map((version) => {
                        const cfg = statusConfig[version.status];
                        const StatusIcon = cfg.icon;
                        const isSelected = version.id === selectedVersionId;
                        return (
                            <button
                                key={version.id}
                                onClick={() => {
                                    setSelectedVersionId(version.id);
                                    setSelectedProposalId(null);
                                }}
                                className={cn(
                                    "flex-shrink-0 min-w-[200px] p-4 rounded-lg border-2 transition-all text-left",
                                    isSelected
                                        ? "border-primary bg-primary/5 shadow-md"
                                        : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full border flex items-center gap-1", cfg.color)}>
                                        <StatusIcon className="w-3 h-3" />
                                        {cfg.label}
                                    </span>
                                    {isSelected && <ChevronRight className="w-4 h-4 text-primary" />}
                                </div>
                                <div className="font-semibold text-sm">{version.label}</div>
                                <div className="text-xs text-muted-foreground mt-1">{version.timestamp}</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                        <svg className="w-full h-full">
                                            <rect
                                                height="100%"
                                                width={`${version.inclusionScore}%`}
                                                className={cn("transition-all duration-500", version.inclusionScore >= 75 ? "fill-green-500" : "fill-yellow-500")}
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground">{version.inclusionScore}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Version Detail & Proposals */}
            {selectedVersion ? (
                <div className="space-y-8">
                    {/* Version Detail Summary (GI-032) */}
                    <div className="bg-muted/30 border border-border p-4 rounded-lg flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                {selectedVersion.label} Detail
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                {selectedVersion.domains.map((d: string) => (
                                    <span key={d} className="text-[10px] uppercase font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                            <div className="flex flex-col items-end">
                                <div className="text-xs text-muted-foreground">Inclusion Score</div>
                                <div className={cn("text-lg font-bold", selectedVersion.inclusionScore >= 80 ? "text-green-500" : "text-yellow-500")}>
                                    {selectedVersion.inclusionScore}%
                                </div>
                            </div>
                            {(() => {
                                const activeSession = getActiveSessionForArtifact(sessions, selectedVersion.id);
                                if (activeSession) {
                                    return (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                            onClick={() => handleJoinSession(activeSession.id)}
                                            data-testid="session-join"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            Join Active Session
                                        </Button>
                                    );
                                }
                                return (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => handleStartSession(selectedVersion.id)}
                                        data-testid="session-start"
                                    >
                                        <PlayCircle className="w-4 h-4" />
                                        Start Session
                                    </Button>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Proposals */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Proposals — {selectedVersion.label}
                        </h3>
                        {proposals.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No proposals in this version.</p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {proposals.map((proposal) => {
                                    const cfg = proposalStatusConfig[proposal.status];
                                    const StatusIcon = cfg.icon;
                                    const isSelected = proposal.id === selectedProposalId;
                                    const entryCount = MOCK_CONSIDERATIONS.filter((c) => c.proposalId === proposal.id).length;
                                    return (
                                        <button
                                            key={proposal.id}
                                            onClick={() => setSelectedProposalId(isSelected ? null : proposal.id)}
                                            className={cn(
                                                "p-4 rounded-lg border text-left transition-all",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                                                    : cn("bg-card hover:shadow-sm", cfg.bg)
                                            )}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <StatusIcon className={cn("w-4 h-4", cfg.color)} />
                                                    <span className={cn("text-xs font-medium capitalize", cfg.color)}>
                                                        {proposal.status}
                                                    </span>
                                                </div>
                                                {entryCount > 0 && (
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                                                        {entryCount} review{entryCount > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-semibold text-sm">{proposal.title}</div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{proposal.summary}</p>
                                            <div className="text-[10px] text-muted-foreground mt-2">By {proposal.author}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Consideration Ledger */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Consideration Ledger
                            {selectedProposalId && (
                                <button
                                    onClick={() => setSelectedProposalId(null)}
                                    className="ml-2 text-[10px] text-primary hover:underline font-normal normal-case"
                                >
                                    (show all)
                                </button>
                            )}
                        </h3>
                        {considerations.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No considerations recorded yet.</p>
                        ) : (
                            <ScrollArea className="h-[450px] border border-border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted z-10">
                                        <tr className="border-b border-border shadow-sm">
                                            <th className="text-left px-4 py-2.5 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Peer</th>
                                            <th className="text-left px-4 py-2.5 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Domains</th>
                                            <th className="text-left px-4 py-2.5 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Lens</th>
                                            <th className="text-left px-4 py-2.5 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Verdict</th>
                                            <th className="text-left px-4 py-2.5 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {considerations.map((entry) => {
                                            const cfg = verdictConfig[entry.verdict];
                                            const VerdictIcon = cfg.icon;
                                            return (
                                                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-xs">@{entry.peerName}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(MOCK_PEERS.find(p => p.name === entry.peerName)?.domains || []).map((d: string) => (
                                                                <span key={d} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50">
                                                                    {d}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{entry.lens}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color)}>
                                                            <VerdictIcon className="w-3 h-3" />
                                                            {entry.verdict}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] text-muted-foreground max-w-xs">{entry.note}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        )}
                    </section>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg text-muted-foreground gap-4">
                    <div className="p-4 rounded-full bg-muted/50">
                        <Archive className="w-8 h-8 opacity-20" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium">No Artifacts Found</p>
                        <p className="text-sm">Artifacts only appear when a session is finalized or demo seeds are enabled.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
