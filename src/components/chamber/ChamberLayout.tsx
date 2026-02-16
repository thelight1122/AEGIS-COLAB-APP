import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { PeerPresence } from './PeerPresence';
import { TelemetryPanel } from './TelemetryPanel';
import { WhiteboardArea } from './WhiteboardArea';
import { Tag, Edit2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useIDS } from '../../contexts/IDSContext';
import { MOCK_PEERS, MOCK_TELEMETRY, type TelemetryData } from '../../types';
import { IDSStream } from './IDSStream';
import { computeInclusionState, canLock } from '../../core/governance/inclusionState';
import type { Artifact as GovernanceArtifact, Peer as GovernancePeer, Lens as GovernanceLens, GovernanceEvent, InclusionState as GovernanceInclusionState } from '../../core/governance/types';

import { useLocation, useNavigate } from 'react-router-dom';
import {
    loadSessions,
    saveSessions,
    touchSessionActivity,
    closeSession
} from '../../core/sessions/sessionStore';
import type { Session as LiveSession } from '../../core/sessions/types';

export function ChamberLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [sessions] = useState<LiveSession[]>(() => loadSessions());

    // Find active session from state or fallback to first active
    const sessionId = location.state?.sessionId;
    const currentSession = useMemo(() => {
        if (sessionId) return sessions.find(s => s.id === sessionId);
        // Fallback for refresh: find any active session
        return sessions.find(s => s.status === 'Active');
    }, [sessions, sessionId]);

    const artifactId = currentSession?.artifactId || 'current-artifact';

    const {
        focusNodeId,
        setNodes,
        canvasNodes,
        addCard,
        attachNode,
        removeAttachment,
        setFocusNode
    } = useIDS();

    // Unified Governance Event Stream (Concurrency Model v0.1)
    const [governingEvents, setGoverningEvents] = useState<GovernanceEvent[]>(
        currentSession?.eventLog || []
    );

    // Sync events to session storage
    useEffect(() => {
        if (!currentSession) return;
        const allSessions = loadSessions();
        const nextSessions = allSessions.map(s =>
            s.id === currentSession.id ? { ...s, eventLog: governingEvents, lastActiveAt: Date.now() } : s
        );
        saveSessions(nextSessions);
    }, [governingEvents, currentSession]);

    // Heartbeat activity
    useEffect(() => {
        if (!currentSession) return;
        const interval = setInterval(() => {
            const allSessions = loadSessions();
            const nextSessions = touchSessionActivity(allSessions, currentSession.id);
            saveSessions(nextSessions);
        }, 10000); // 10s heartbeat
        return () => clearInterval(interval);
    }, [currentSession]);

    // Artifact Metadata
    const [artifactMetadata, setArtifactMetadata] = useState({
        title: currentSession?.artifactId === 'v4' ? 'Operational Layer — Prism Refract Behavior' : `Artifact ${currentSession?.artifactId || 'Draft'}`,
        domains: currentSession?.artifactId === 'v4' ? ['Engineering', 'Product', 'Risks'] : ['General']
    });
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [tempMetadata, setTempMetadata] = useState(artifactMetadata);

    const isLocked = useMemo(() => {
        return governingEvents.some(e => e.type === 'LOCK_REQUEST');
    }, [governingEvents]);

    // Telemetry Data using Formal State Machine (GI-001)
    const telemetry = useMemo((): TelemetryData => {
        const governArtifact: GovernanceArtifact = {
            id: artifactId,
            domainTags: artifactMetadata.domains,
            status: "Active"
        };

        const governPeers: GovernancePeer[] = MOCK_PEERS.map(p => ({
            id: p.id,
            type: p.type,
            declaredDomains: p.domains,
            lensIds: []
        }));

        const governLenses: GovernanceLens[] = MOCK_TELEMETRY.lenses.map(l => ({
            id: l.name,
            domains: l.domains,
            autoReview: false
        }));

        const inclusion: GovernanceInclusionState = computeInclusionState(governArtifact, governPeers, governLenses, governingEvents);

        return {
            inclusionScore: Math.round(inclusion.awarenessPercent * 100),
            drift: 12,
            convergence: 45,
            lenses: inclusion.intersectingLenses.map(id => {
                const gl = governLenses.find(l => l.id === id)!;
                const deferred = inclusion.deferredLenses.find(d => d.lensId === id);
                return {
                    name: id,
                    status: inclusion.representedLenses.includes(id) ? 'active' : (deferred ? 'deferred' : 'missing'),
                    domains: gl.domains,
                    deferralRationale: deferred?.rationale
                };
            }),
            lockAvailable: inclusion.lockAvailable,
            activeDomains: artifactMetadata.domains,
            inclusion
        };
    }, [artifactMetadata.domains, governingEvents, artifactId]);

    const currentPeers = useMemo(() => {
        const acks = new Set(governingEvents.filter(e => e.type === 'AWARENESS_ACK').map(e => {
            if (e.type === 'AWARENESS_ACK') return e.peerId;
            return null;
        }));
        return MOCK_PEERS.map(p => ({
            ...p,
            acknowledged: acks.has(p.id)
        }));
    }, [governingEvents]);

    const handleNodesReady = useCallback((nodes: { id: string; label: string; type: string }[]) => {
        setNodes(nodes);
    }, [setNodes]);

    const handleAcknowledge = useCallback((peerId: string) => {
        setGoverningEvents(prev => [
            ...prev,
            { type: 'AWARENESS_ACK', peerId, timestamp: Date.now() }
        ]);
    }, []);

    const handleInvokeLens = useCallback((lensId: string) => {
        setGoverningEvents(prev => [
            ...prev,
            { type: 'PROXY_REVIEW', lensId, timestamp: Date.now() }
        ]);
    }, []);

    const handleDeferLens = useCallback((lensId: string, rationale?: string) => {
        setGoverningEvents(prev => [
            ...prev,
            { type: 'DEFER_LENS', lensId, rationale: rationale || 'No rationale provided', timestamp: Date.now() }
        ]);
    }, []);

    const handleCloseSession = useCallback(() => {
        if (!currentSession) return;
        const allSessions = loadSessions();
        const nextSessions = closeSession(allSessions, currentSession.id);
        saveSessions(nextSessions);
        navigate('/artifacts');
    }, [currentSession, navigate]);

    const handleLockVersion = useCallback(() => {
        if (isLocked) return;

        const governArtifact: GovernanceArtifact = {
            id: artifactId,
            domainTags: artifactMetadata.domains,
            status: "Active"
        };
        const governPeers: GovernancePeer[] = MOCK_PEERS.map(p => ({
            id: p.id,
            type: p.type,
            declaredDomains: p.domains,
            lensIds: []
        }));
        const governLenses: GovernanceLens[] = MOCK_TELEMETRY.lenses.map(l => ({
            id: l.name,
            domains: l.domains,
            autoReview: false
        }));

        const { ok, state } = canLock(governArtifact, governPeers, governLenses, governingEvents);

        if (!ok) {
            alert(`Lock denied. Reasons:\n- ${state.reasons.join('\n- ')}`);
            return;
        }

        const participatingPeers = currentPeers.filter(p => p.acknowledged).map(p => p.name);
        const representedLenses = telemetry.lenses.filter(l => l.status === 'active').map(l => l.name);
        const deferredLenses = telemetry.lenses.filter(l => l.status === 'deferred').map(l => `${l.name} (${l.deferralRationale})`);

        const ledgerSnapshot = [
            `🔒 Version Locked: "${artifactMetadata.title}"`,
            `Score: ${telemetry.inclusionScore}%`,
            `Notified Peers: ${currentPeers.map(p => p.name).join(', ')}`,
            `Participating Peers: ${participatingPeers.join(', ')}`,
            `Lenses Represented: ${representedLenses.join(', ')}`,
            `Lenses Deferred: ${deferredLenses.join(', ')}`,
            `Unresolved Tensions: 0`,
            `Closure Rationale: Coherence criteria satisfied.`
        ].join('\n');

        alert(ledgerSnapshot);

        setGoverningEvents(prev => [
            ...prev,
            { type: 'LOCK_REQUEST', timestamp: Date.now() }
        ]);
    }, [artifactMetadata.title, artifactMetadata.domains, currentPeers, telemetry, governingEvents, artifactId, isLocked]);

    const saveMetadata = () => {
        setArtifactMetadata(tempMetadata);
        setIsEditingMetadata(false);
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Governance Header */}
            <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-6 z-30 backdrop-blur-sm">
                <div className="flex items-center gap-4 flex-1">
                    {isEditingMetadata ? (
                        <div className="flex items-center gap-2 flex-1 max-w-2xl">
                            <input
                                className="bg-muted border border-border rounded px-3 py-1 text-sm flex-1 font-semibold text-foreground"
                                value={tempMetadata.title}
                                aria-label="Artifact Title"
                                placeholder="Artifact Title"
                                onChange={(e) => setTempMetadata(prev => ({ ...prev, title: e.target.value }))}
                            />
                            <input
                                className="bg-muted border border-border rounded px-3 py-1 text-xs w-64 text-foreground"
                                value={tempMetadata.domains.join(', ')}
                                aria-label="Target Domains"
                                onChange={(e) => setTempMetadata(prev => ({ ...prev, domains: e.target.value.split(',').map(d => d.trim()).filter(Boolean) }))}
                                placeholder="Domains (comma separated)"
                            />
                            <Button size="sm" onClick={saveMetadata} title="Save Metadata" className="h-8 w-8 p-0">
                                <Check className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    {artifactMetadata.title}
                                    <button
                                        onClick={() => { setTempMetadata(artifactMetadata); setIsEditingMetadata(true); }}
                                        className="text-muted-foreground hover:text-primary"
                                        title="Edit Metadata"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </h2>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Tag className="w-3 h-3 text-muted-foreground" />
                                    {artifactMetadata.domains.map(d => (
                                        <span key={d} className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {currentSession && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 border-red-500/30 hover:bg-red-500/10 h-8 font-semibold"
                            onClick={handleCloseSession}
                        >
                            Close Session
                        </Button>
                    )}
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        Governance Integrity v1.0
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
                <div className={cn("w-64 flex-shrink-0 z-10 shadow-xl shadow-black/5", isLocked && "opacity-60 pointer-events-none")}>
                    <PeerPresence
                        peers={currentPeers.filter(p => p.domains.some(d => artifactMetadata.domains.includes(d)))}
                        onAcknowledge={handleAcknowledge}
                    />
                </div>

                <div className="flex-1 relative min-w-0 z-0">
                    <WhiteboardArea
                        focusNodeId={focusNodeId}
                        onNodesReady={handleNodesReady}
                    />
                </div>

                <div className={cn("w-72 flex-shrink-0 z-10 shadow-xl shadow-black/5 border-l border-border bg-card", isLocked && "opacity-60 pointer-events-none")}>
                    <TelemetryPanel
                        telemetry={telemetry}
                        peers={currentPeers}
                        onInvokeLens={handleInvokeLens}
                        onDeferLens={handleDeferLens}
                        onAcknowledge={handleAcknowledge}
                        onLockVersion={handleLockVersion}
                    />
                </div>
            </div>

            <div className="h-44 border-t border-border bg-card flex-shrink-0">
                <IDSStream
                    cards={[]}
                    nodes={canvasNodes}
                    onAttach={attachNode}
                    onRemoveAttachment={removeAttachment}
                    onFocusNode={setFocusNode}
                    onSend={addCard}
                    showFeed={false}
                    showHeader={true}
                    showComposer={true}
                />
            </div>
        </div>
    );
}
