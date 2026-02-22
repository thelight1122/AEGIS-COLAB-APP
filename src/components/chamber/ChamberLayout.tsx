import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { PeerPresence } from './PeerPresence';
import { TelemetryPanel } from './TelemetryPanel';
import { WhiteboardArea } from './WhiteboardArea';
import { GatewayStatus } from './GatewayStatus';
import { Tag, Edit2, Check, History, Layout, Clock, Bot, User, MessageSquare, XCircle, Code, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
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
    domainTags: ['Product', 'Engineering'],
    isHighImpact: false,
    hasTension: false
};

export default function ChamberLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [sessions] = useState<LiveSession[]>(() => loadSessions());

    const sessionId = location.state?.sessionId;
    const currentSession = useMemo(() => {
        if (sessionId) return sessions.find(s => s.id === sessionId);
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

    const [governingEvents, setGoverningEvents] = useState<GovernanceEvent[]>(
        currentSession?.eventLog || []
    );

    useEffect(() => {
        if (!currentSession) return;
        const allSessions = loadSessions();
        const nextSessions = allSessions.map(s =>
            s.id === currentSession.id ? { ...s, eventLog: governingEvents, lastActiveAt: Date.now() } : s
        );
        saveSessions(nextSessions);
    }, [governingEvents, currentSession]);

    useEffect(() => {
        if (!currentSession) return;
        const interval = setInterval(() => {
            const allSessions = loadSessions();
            const nextSessions = touchSessionActivity(allSessions, currentSession.id);
            saveSessions(nextSessions);
        }, 10000);
        return () => clearInterval(interval);
    }, [currentSession]);

    useEffect(() => {
        if (!currentSession) return;
        const channel = new BroadcastChannel(`aegis-session-${currentSession.id}`);

        const handleMessage = (msg: MessageEvent) => {
            if (msg.data.type === 'TAB_JOINED') {
                const snapshotTime = new Date().toISOString();
                setDisplacedSnapshot({ time: snapshotTime, events: governingEvents });
            }
        };

        channel.addEventListener('message', handleMessage);
        channel.postMessage({ type: 'TAB_JOINED' });

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [currentSession, governingEvents]);

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

    const registryPeers = useMemo<PeerProfile[]>(() => {
        const rawPeers = loadRegistryPeers();
        const circleOfFour = ['@tracey', '@linq', '@lumin', '@vespar'];
        if (isE2E()) {
            circleOfFour.push('@user', '@sarah');
        }
        return rawPeers.filter(p => circleOfFour.includes(p.handle) && p.enabled);
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

        const lens_acknowledgments: Record<string, boolean | string> = {};
        telemetry.lenses.forEach(l => {
            lens_acknowledgments[l.name] = l.status === 'active' ? true : (l.status === 'deferred' ? (l.deferralRationale || true) : false);
        });

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

    const handleClearChat = useCallback(() => {
        if (!currentSession) return;
        if (!window.confirm('Clear artifact dialogue? History is preserved in the append-only ledger, but the chat view will reset. (Local-only session clear)')) {
            return;
        }

        setGoverningEvents(prev => {
            const ev = createHardenedEvent('SESSION_CLEARED', {
                reason: 'User manual clear'
            });
            return [...prev, ev];
        });
    }, [currentSession, createHardenedEvent]);

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
            alert(`Lock denied. Reasons: \n - ${state.reasons.join('\n- ')}`);
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

    const chatMessages = useMemo(() => deriveChatThread(governingEvents), [governingEvents]);

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
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

                <div className="flex-1 relative min-w-0 z-0 bg-muted/20 text-foreground">
                    {activeTab === 'whiteboard' ? (
                        <WhiteboardArea
                            focusNodeId={focusNodeId}
                            onNodesReady={handleNodesReady}
                        />
                    ) : (
                        <div className="h-full flex flex-col p-6 space-y-6 max-w-4xl mx-auto overflow-hidden">
                            <div className="flex-[3] min-h-0 flex flex-col bg-card/40 rounded-xl border border-border/50 overflow-hidden shadow-sm">
                                <header className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/30 shrink-0">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Artifact Dialogue
                                    </h3>
                                    <button
                                        onClick={handleClearChat}
                                        className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                                        title="Clear chat view"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </header>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                                    {chatMessages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 space-y-4">
                                            <MessageSquare className="w-12 h-12 stroke-[1]" />
                                            <p className="text-sm font-medium tracking-tight">No active dialogue. Begin session.</p>
                                        </div>
                                    ) : (
                                        chatMessages.map(msg => (
                                            <div key={msg.id} className={cn(
                                                "flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                msg.role === 'user' ? "items-end" : "items-start"
                                            )}>
                                                <div className="flex items-center gap-2 px-1">
                                                    {msg.role === 'assistant' && (
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                            {registryPeers.find(p => p.id === msg.peerId)?.name || 'AI Peer'}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] tabular-nums font-mono text-muted-foreground/60">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                                                    msg.role === 'user'
                                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                                        : msg.status === 'error'
                                                            ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-none font-medium"
                                                            : "bg-muted border border-border text-foreground rounded-tl-none"
                                                )}>
                                                    {msg.content}
                                                    {msg.status === 'error' && msg.errorDetails && (
                                                        <div className="mt-2 text-[10px] opacity-70 border-t border-destructive/20 pt-2 font-mono">
                                                            {msg.errorDetails}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex-[2] min-h-0 flex flex-col bg-muted/5 rounded-xl border border-border/30 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                <header className="px-4 py-2 border-b border-border/30 flex items-center gap-2 bg-muted/20 shrink-0">
                                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Governance Ledger</h3>
                                </header>

                                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px]">
                                    {governingEvents.length === 0 ? (
                                        <p className="text-muted-foreground/40 italic p-4">Ledger empty.</p>
                                    ) : (
                                        [...governingEvents].reverse().map((event, idx) => (
                                            <div key={idx} className="flex gap-4 p-2 rounded hover:bg-muted/30 transition-colors group">
                                                <div className="shrink-0 text-muted-foreground/40 w-16">
                                                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </div>
                                                <div className="flex-1">
                                                    <span className={cn(
                                                        "font-bold mr-2",
                                                        event.type.startsWith('AI_') ? "text-blue-500" :
                                                            event.type === 'SESSION_CLEARED' ? "text-red-500" :
                                                                "text-primary"
                                                    )}>
                                                        {event.type}
                                                    </span>
                                                    <span className="text-muted-foreground break-all">
                                                        {event.type === 'AI_CHAT_REQUESTED' && `: ${event.prompt.substring(0, 40)}...`}
                                                        {event.type === 'AWARENESS_ACK' && ` by ${event.peerId}`}
                                                        {event.type === 'CONTRIBUTION' && ` peer:${event.peerId} lens:${event.lensId || 'none'}`}
                                                        {event.type === 'SESSION_CLEARED' && ` (${event.reason})`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
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

export { LOG_STORAGE_KEY, METADATA_KEY };
