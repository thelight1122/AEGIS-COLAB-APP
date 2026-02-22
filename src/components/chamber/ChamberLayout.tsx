import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { PeerPresence } from './PeerPresence';
import { TelemetryPanel } from './TelemetryPanel';
import { WhiteboardArea } from './WhiteboardArea';
import { GatewayStatus } from './GatewayStatus';
import { Tag, Edit2, Check, History, Layout, Clock, Bot, User, MessageSquare, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useIDS } from '../../contexts/IDSContext';
import type { Artifact as GovernanceArtifact, Peer as GovernancePeer, Lens as GovernanceLens, GovernanceEvent, InclusionState as GovernanceInclusionState } from '../../core/governance/types';
import { MOCK_TELEMETRY, type TelemetryData } from '../../types';
import { IDSStream } from './IDSStream';
import { computeInclusionState, canLock } from '../../core/governance/inclusionState';
import { RATIONAL_SYNTHESIS_LENS, AFFECTIVE_SYNTHESIS_LENS } from '../../core/governance/systemLenses';
import { callGateway } from '../../core/llm/gatewayClient';
import { deriveChatThread } from '../../core/governance/chatDerivation';

import { useLocation, useNavigate } from 'react-router-dom';
import { isE2E } from '../../lib/e2e';
import {
    loadSessions,
    saveSessions,
    touchSessionActivity,
    closeSession
} from '../../core/sessions/sessionStore';
import type { Session as LiveSession } from '../../core/sessions/types';
import type { PeerProfile } from '../../core/peers/types';
import { loadPeers as loadRegistryPeers } from '../../core/peers/peerRegistryStore';
import type { Peer } from '../../types';

const LOG_STORAGE_KEY = 'aegis_events_current-artifact';
const METADATA_KEY = 'aegis_metadata_current-artifact';

const defaultMetadata = {
    id: 'current-artifact',
    label: 'Main Logic Protocol',
    domainTags: ['Product', 'Engineering'], // Intersection with multiple peers, ensuring un-acked state if no seeds
    isHighImpact: false,
    hasTension: false
};

export default function ChamberLayout() {
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

    const [displacedSnapshot, setDisplacedSnapshot] = useState<{ time: string, events: GovernanceEvent[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'whiteboard' | 'reflection'>('whiteboard');
    const [selectedChatPeerIds, setSelectedChatPeerIds] = useState<string[]>([]);
    const [isChatting, setIsChatting] = useState(false);

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

    // Session Protection (Multi-tab Hijack) (GI-003)
    useEffect(() => {
        if (!currentSession) return;
        const channel = new BroadcastChannel(`aegis-session-${currentSession.id}`);

        const handleMessage = (msg: MessageEvent) => {
            if (msg.data.type === 'TAB_JOINED') {
                // Another tab joined, snapshot and displace this one (SSSP)
                const snapshotTime = new Date().toISOString();
                setDisplacedSnapshot({ time: snapshotTime, events: governingEvents });
                // We could also record an SSSP event to the ledger if we want
            }
        };

        channel.addEventListener('message', handleMessage);
        channel.postMessage({ type: 'TAB_JOINED' });

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [currentSession, governingEvents]);

    // Artifact Metadata
    const [artifactMetadata, setArtifactMetadata] = useState(() => {
        const stored = localStorage.getItem(METADATA_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return {
                    title: parsed.label || parsed.title || parsed.labels?.[0] || 'Main Logic Protocol',
                    domains: parsed.domainTags || parsed.domains || [],
                    isHighImpact: !!parsed.isHighImpact,
                    hasTension: !!parsed.hasTension
                };
            } catch (e) { console.error('Failed to parse metadata', e); }
        }

        if (currentSession?.artifactId === 'v4' || artifactId === 'v4') {
            return {
                title: 'Operational Layer — Prism Refract Behavior',
                domains: ['Engineering', 'Product', 'Risks'],
                isHighImpact: true,
                hasTension: false
            };
        }

        return {
            title: defaultMetadata.label,
            domains: defaultMetadata.domainTags,
            isHighImpact: defaultMetadata.isHighImpact,
            hasTension: defaultMetadata.hasTension
        };
    });

    // Load peers from registry and filter for the Circle of Four (plus E2E peers if active)
    const registryPeers = useMemo<PeerProfile[]>(() => {
        const rawPeers = loadRegistryPeers();
        const circleOfFour = ['@tracey', '@linq', '@lumin', '@vespar'];
        if (isE2E()) {
            circleOfFour.push('@user', '@sarah');
        }
        return rawPeers.filter(p => circleOfFour.includes(p.handle));
    }, []);

    useEffect(() => {
        if (isE2E()) {
            window.__AEGIS_LAST_METADATA__ = artifactMetadata;
        }
    }, [artifactMetadata]);

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
            status: "Active",
            isHighImpact: (artifactMetadata as { isHighImpact?: boolean }).isHighImpact,
            hasTension: (artifactMetadata as { hasTension?: boolean }).hasTension
        };

        const governPeers: GovernancePeer[] = registryPeers.map(p => ({
            id: p.id,
            type: p.type,
            domains: p.domains,
            lensIds: []
        }));

        const governLenses: GovernanceLens[] = [
            ...MOCK_TELEMETRY.lenses.map(l => ({
                id: l.name,
                domains: l.domains,
                autoReview: false
            })),
            { id: RATIONAL_SYNTHESIS_LENS, domains: [], autoReview: false },
            { id: AFFECTIVE_SYNTHESIS_LENS, domains: [], autoReview: false }
        ];

        const inclusion: GovernanceInclusionState = computeInclusionState(governArtifact, governPeers, governLenses, governingEvents);

        return {
            inclusionScore: Math.round(inclusion.awarenessPercent * 100),
            drift: 12,
            convergence: 45,
            lenses: (inclusion.intersectingLenses || []).map(id => {
                const gl = governLenses.find(l => l.id === id) || { domains: [] };
                const deferred = inclusion.deferredLenses.find(d => d.lensId === id);
                return {
                    name: id,
                    status: inclusion.representedLenses.includes(id) ? 'active' : (deferred ? 'deferred' : 'missing'),
                    domains: gl.domains,
                    deferralRationale: deferred?.rationale
                };
            }),
            lockAvailable: !!inclusion.lockAvailable,
            activeDomains: artifactMetadata.domains,
            inclusion
        };
    }, [artifactMetadata, governingEvents, artifactId, registryPeers]);

    const currentPeers = useMemo<Peer[]>(() => {
        const acks = new Set(governingEvents.filter(e => e.type === 'AWARENESS_ACK').map(e => {
            if (e.type === 'AWARENESS_ACK') return e.peerId;
            return null;
        }));
        return registryPeers.map(p => ({
            id: p.id,
            name: p.name || p.handle,
            type: p.type,
            role: p.notes?.slice(0, 30) || (p.type === 'ai' ? 'AI Assistant' : 'Human Member'),
            status: p.enabled ? 'online' : 'offline',
            acknowledged: acks.has(p.id),
            domains: p.domains
        }));
    }, [governingEvents, registryPeers]);

    const handleNodesReady = useCallback((nodes: { id: string; label: string; type: string }[]) => {
        setNodes(nodes);
    }, [setNodes]);

    const createHardenedEvent = useCallback((type: GovernanceEvent['type'], extra: Partial<GovernanceEvent> = {}): GovernanceEvent => {
        const timestamp = Date.now();
        const timestamp_utc = new Date(timestamp).toISOString();
        const scoreBefore = telemetry.inclusionScore;

        // Lens acknowledgments current state
        const lens_acknowledgments: Record<string, boolean | string> = {};
        telemetry.lenses.forEach(l => {
            lens_acknowledgments[l.name] = l.status === 'active' ? true : (l.status === 'deferred' ? (l.deferralRationale || true) : false);
        });

        // Simulate next state to find awareness_score_after
        const nextEvents: GovernanceEvent[] = [...governingEvents, { ...extra, type, timestamp, timestamp_utc } as GovernanceEvent];
        const nextInclusion = computeInclusionState(
            { id: artifactId, domainTags: artifactMetadata.domains, status: 'Active' },
            registryPeers.map(p => ({ id: p.id, type: p.type, domains: p.domains })),
            [
                ...MOCK_TELEMETRY.lenses.map(l => ({ id: l.name, domains: l.domains, autoReview: false })),
                { id: RATIONAL_SYNTHESIS_LENS, domains: [], autoReview: false },
                { id: AFFECTIVE_SYNTHESIS_LENS, domains: [], autoReview: false }
            ],
            nextEvents
        );

        return {
            ...extra,
            type,
            timestamp,
            timestamp_utc,
            participant_session_id: currentSession?.id || 'anon',
            awareness_score_before: scoreBefore,
            awareness_score_after: Math.round(nextInclusion.awarenessPercent * 100),
            lens_acknowledgments
        } as GovernanceEvent;
    }, [telemetry, currentSession, governingEvents, artifactId, artifactMetadata.domains, registryPeers]);

    const handleChat = useCallback(async (text: string) => {
        if (!currentSession) return;
        if (selectedChatPeerIds.length === 0) return;

        setIsChatting(true);
        try {
            // Log local user message as a contribution? Or just the AI request
            // For now, let's log the REQUESTED event
            const selectedPeers = registryPeers.filter(p => selectedChatPeerIds.includes(p.id));

            for (const peer of selectedPeers) {
                if (peer.type !== 'ai') continue;

                setGoverningEvents(prev => {
                    const ev = createHardenedEvent('AI_CHAT_REQUESTED', {
                        peerId: peer.id,
                        provider: peer.provider,
                        model: peer.model,
                        prompt: text
                    });
                    return [...prev, ev];
                });

                // Call Gateway
                try {
                    const response = await callGateway({
                        provider: peer.provider,
                        model: peer.model,
                        apiKey: peer.apiKey,
                        baseURL: peer.baseURL,
                        messages: [
                            { role: 'system', content: 'You are an AEGIS peer. Be concise.' },
                            { role: 'user', content: text }
                        ]
                    });

                    setGoverningEvents(prev => {
                        const ev = createHardenedEvent('AI_CHAT_COMPLETED', {
                            peerId: peer.id,
                            responseText: response.text
                        });
                        return [...prev, ev];
                    });
                } catch (err) {
                    console.error('Model call failed:', err);
                    setGoverningEvents(prev => {
                        const ev = createHardenedEvent('AI_CHAT_FAILED', {
                            peerId: peer.id,
                            error: err instanceof Error ? err.message : 'Unknown provider error'
                        });
                        return [...prev, ev];
                    });
                }
            }
        } catch (error) {
            console.error('Chat thread failed', error);
        } finally {
            setIsChatting(false);
        }
    }, [currentSession, selectedChatPeerIds, registryPeers, createHardenedEvent]);

    const handleAcknowledge = useCallback((peerId: string) => {
        setGoverningEvents(prev => {
            const ev = createHardenedEvent('AWARENESS_ACK', { peerId });
            return [...prev, ev];
        });
    }, [createHardenedEvent]);

    const handleInvokeLens = useCallback((lensId: string) => {
        setGoverningEvents(prev => {
            const ev = createHardenedEvent('PROXY_REVIEW', { lensId });
            return [...prev, ev];
        });
    }, [createHardenedEvent]);

    const handleDeferLens = useCallback((lensId: string, rationale?: string) => {
        setGoverningEvents(prev => {
            const ev = createHardenedEvent('lens_deferral_with_rationale', {
                lensId,
                rationale: rationale || 'Explicitly skipped by peer'
            });
            return [...prev, ev];
        });
    }, [createHardenedEvent]);

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
            status: "Active",
            isHighImpact: (artifactMetadata as { isHighImpact?: boolean }).isHighImpact,
            hasTension: (artifactMetadata as { hasTension?: boolean }).hasTension
        };
        const governPeers: GovernancePeer[] = registryPeers.map(p => ({
            id: p.id,
            type: p.type,
            domains: p.domains,
            lensIds: []
        }));
        const governLenses: GovernanceLens[] = [
            ...MOCK_TELEMETRY.lenses.map(l => ({
                id: l.name,
                domains: l.domains,
                autoReview: false
            })),
            { id: RATIONAL_SYNTHESIS_LENS, domains: [], autoReview: false },
            { id: AFFECTIVE_SYNTHESIS_LENS, domains: [], autoReview: false }
        ];

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

        setGoverningEvents(prev => {
            const ev = createHardenedEvent('LOCK_REQUEST');
            return [...prev, ev];
        });
    }, [artifactMetadata, currentPeers, telemetry, governingEvents, artifactId, isLocked, registryPeers, createHardenedEvent]);

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
                                        data-testid="edit-metadata"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </h2>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Tag className="w-3 h-3 text-muted-foreground" />
                                    {artifactMetadata.domains.map((d: string) => (
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
                    <GatewayStatus />
                    <div className="flex bg-muted p-1 rounded-md mr-4">
                        <button
                            className={cn("px-3 py-1 text-xs rounded-sm transition-all flex items-center gap-1.5", activeTab === 'whiteboard' ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setActiveTab('whiteboard')}
                        >
                            <Layout className="w-3.5 h-3.5" />
                            Nexus Whiteboard
                        </button>
                        <button
                            className={cn("px-3 py-1 text-xs rounded-sm transition-all flex items-center gap-1.5", activeTab === 'reflection' ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setActiveTab('reflection')}
                            data-testid="reflection-tab"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Timeline · Reflection
                        </button>
                    </div>

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
                    {isE2E() && (
                        <div className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold rounded uppercase tracking-tight">
                            E2E Mode
                        </div>
                    )}
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        Governance Integrity v1.0
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
                <div className={cn("w-64 flex-shrink-0 z-10 shadow-xl shadow-black/5", isLocked && "opacity-60 pointer-events-none")}>
                    <div className="absolute inset-x-0 -top-6 flex justify-center pointer-events-none z-50">
                        {isChatting && (
                            <div className="bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold px-3 py-1 rounded-full animate-pulse border border-primary/30">
                                AI PEERS PROCESSING...
                            </div>
                        )}
                    </div>
                    <PeerPresence
                        peers={currentPeers.filter(p => p.domains.some(d => artifactMetadata.domains.includes(d)))}
                        onAcknowledge={handleAcknowledge}
                        onSelectionChange={setSelectedChatPeerIds}
                    />
                </div>

                <div className="flex-1 relative min-w-0 z-0 bg-muted/20">
                    {activeTab === 'whiteboard' ? (
                        <WhiteboardArea
                            focusNodeId={focusNodeId}
                            onNodesReady={handleNodesReady}
                        />
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="p-8 space-y-6 max-w-3xl mx-auto">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Chat Thread
                                    </h3>
                                    <div className="space-y-3">
                                        {deriveChatThread(governingEvents).map(msg => (
                                            <div
                                                key={msg.id}
                                                className={cn(
                                                    "p-3 rounded-lg text-sm max-w-[85%] border shadow-sm",
                                                    msg.role === 'assistant'
                                                        ? msg.status === 'error'
                                                            ? "bg-destructive/5 border-destructive/20 mr-auto text-destructive"
                                                            : "bg-primary/5 border-primary/20 mr-auto"
                                                        : "bg-muted border-border/50 ml-auto"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1 text-[10px] font-bold uppercase opacity-60">
                                                    {msg.role === 'assistant' ? (
                                                        <>
                                                            <Bot className="w-3 h-3" />
                                                            {registryPeers.find(p => p.id === msg.peerId)?.name || msg.peerId}
                                                            {msg.status === 'error' && <span className="ml-auto text-[9px] bg-destructive text-destructive-foreground px-1.5 rounded-full">Error</span>}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <User className="w-3 h-3" />
                                                            facilitator
                                                        </>
                                                    )}
                                                </div>
                                                {msg.status === 'error' ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-destructive">
                                                            <XCircle className="w-3.5 h-3.5" /> Provider Error
                                                        </div>
                                                        <p className="opacity-80 italic">{msg.content}</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 text-[9px] border-destructive/30 text-destructive hover:bg-destructive/10"
                                                            onClick={() => alert(`Provider Error: ${msg.errorDetails}`)}
                                                        >
                                                            View Details
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                )}
                                            </div>
                                        ))}
                                        {deriveChatThread(governingEvents).length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground text-xs italic">
                                                No messages in this thread yet. Select an AI peer and type in the stream to commence dialogue.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-border/50">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                        <History className="w-4 h-4" />
                                        Governance Ledger
                                    </h3>
                                    {[...governingEvents].reverse().map((event, idx) => (
                                        <div key={idx} className="relative">
                                            <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    <Clock className="w-3 h-3" />
                                                    {event.timestamp_utc ? new Date(event.timestamp_utc).toLocaleString() : new Date(event.timestamp).toLocaleString()}
                                                </div>
                                                <div className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-2">
                                                    <div className="font-semibold text-sm flex items-center justify-between">
                                                        <span className="text-primary">{event.type.replace(/_/g, ' ')}</span>
                                                        <span className="text-[10px] font-mono opacity-50">{event.participant_session_id?.slice(0, 8)}...</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {event.type === 'AWARENESS_ACK' && `Peer ${event.peerId} acknowledged awareness.`}
                                                        {event.type === 'PROXY_REVIEW' && `Lens ${event.lensId} review captured via proxy.`}
                                                        {event.type === 'AI_CHAT_REQUESTED' && (
                                                            <div className="space-y-1">
                                                                <p className="font-semibold text-foreground">Message to {event.peerId}:</p>
                                                                <p className="italic bg-muted/30 p-2 rounded">"{event.prompt}"</p>
                                                            </div>
                                                        )}
                                                        {event.type === 'AI_CHAT_COMPLETED' && (
                                                            <div className="space-y-1">
                                                                <p className="font-semibold text-foreground">Response from {event.peerId}:</p>
                                                                <p className="border-l-2 border-primary/20 pl-2">
                                                                    {event.responseText}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {(event.type === 'DEFER_LENS' || event.type === 'lens_deferral_with_rationale') && (
                                                            <div className="space-y-2">
                                                                <p>Lens {event.lensId} deferred.</p>
                                                                <div className="bg-muted/50 p-2 rounded text-[11px] italic">
                                                                    "{event.rationale}"
                                                                </div>
                                                            </div>
                                                        )}
                                                        {event.type === 'LOCK_REQUEST' && `Lock requested for versioning.`}
                                                    </div>
                                                    <div className="pt-2 flex gap-4 text-[9px] font-mono opacity-70 border-t border-border/50">
                                                        <span>Score: {event.awareness_score_before ?? '??'} → {event.awareness_score_after ?? '??'}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-primary" />
                                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest pl-2">Session Commenced</div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
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
                    onSend={(type, text) => {
                        addCard(type, text);
                        if (selectedChatPeerIds.length > 0) {
                            handleChat(text);
                        }
                    }}
                    showFeed={false}
                    showHeader={true}
                    showComposer={true}
                />
            </div>

            {displacedSnapshot && (
                <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center animate-in fade-in duration-500">
                    <div className="max-w-md space-y-6">
                        <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
                            <History className="w-8 h-8 text-yellow-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Session Continuity Preserved</h2>
                            <p className="text-muted-foreground text-sm">
                                A Snapshot (SSSP) was captured at <span className="font-mono text-primary">{displacedSnapshot.time}</span>.<br />
                                The active session is being continued in another tab.
                            </p>
                        </div>
                        <div className="pt-4 space-y-3">
                            <button
                                className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center gap-2"
                                onClick={() => {
                                    setGoverningEvents(displacedSnapshot.events);
                                    setActiveTab('reflection');
                                    setDisplacedSnapshot(null);
                                }}
                            >
                                <Clock className="w-4 h-4" />
                                View Stability Snapshot
                            </button>
                            <p className="text-[10px] text-muted-foreground">
                                You may re-join the active Nexus after the other tab is closed.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export for use in other components if needed
export { LOG_STORAGE_KEY, METADATA_KEY };
