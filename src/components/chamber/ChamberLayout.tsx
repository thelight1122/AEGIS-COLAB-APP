import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Edit2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useIDS } from '../../contexts/IDSContext';
import type { Artifact as GovernanceArtifact, Peer as GovernancePeer, Lens as GovernanceLens, GovernanceEvent, InclusionState as GovernanceInclusionState } from '../../core/governance/types';
import { type TelemetryData } from '../../types';
import { IDSStream } from './IDSStream';
import { GatewayStatus } from './GatewayStatus';
import { WhiteboardArea } from './WhiteboardArea';
import { TelemetryPanel } from './TelemetryPanel';
import { computeInclusionState, canLock } from '../../core/governance/inclusionState';
import { RATIONAL_SYNTHESIS_LENS, AFFECTIVE_SYNTHESIS_LENS, DEFAULT_DOMAIN_LENSES } from '../../core/governance/systemLenses';
import { callGateway } from '../../core/llm/gatewayClient';
import { useKeyring } from '../../contexts/KeyringContext';

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
import { loadActiveTeam } from '../../core/peers/activeTeamStore';
import { HUMAN_PEER } from '../../core/peers/humanPeer';
import type { Peer, IDSCard } from '../../types';

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
    const { keys: vaultKeys } = useKeyring();
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
        setFocusNode,
        idsCards: idsCardsFromStore,
        setIdsCards: setIdsCardsFromStore
    } = useIDS();

    const [displacedSnapshot, setDisplacedSnapshot] = useState<{ time: string, events: GovernanceEvent[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'whiteboard' | 'reflection'>('whiteboard');
    const [selectedChatPeerIds] = useState<string[]>([]);
    const [isChatting, setIsChatting] = useState(false);

    const [governingEvents, setGoverningEvents] = useState<GovernanceEvent[]>(
        currentSession?.eventLog || []
    );

    useEffect(() => {
        if (!currentSession) return;
        const allSessions = loadSessions();
        const nextSessions = allSessions.map((s: LiveSession) =>
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
        const activeTeam = loadActiveTeam();
        const aiPeers = rawPeers.filter(p => p.enabled && activeTeam.selectedPeerIds.includes(p.id));
        return [HUMAN_PEER, ...aiPeers];
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
            ...DEFAULT_DOMAIN_LENSES,
            { id: RATIONAL_SYNTHESIS_LENS, domains: [], autoReview: false },
            { id: AFFECTIVE_SYNTHESIS_LENS, domains: [], autoReview: false }
        ];

        const inclusion: GovernanceInclusionState = computeInclusionState(governArtifact, governPeers, governLenses, governingEvents);
        
        const drift = Math.min(100, inclusion.detectedShadowAffects.length * 20);
        const convergence = Math.round(inclusion.awarenessPercent * 50 + (1 - inclusion.missingLenses.length / Math.max(1, inclusion.intersectingLenses.length)) * 50);

        return {
            inclusionScore: Math.round(inclusion.awarenessPercent * 100),
            drift,
            convergence,
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
            status: 'online',
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
                ...DEFAULT_DOMAIN_LENSES,
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

    useEffect(() => {
        if (!governingEvents.length) {
            setIdsCardsFromStore([]);
            return;
        }

        const cards = governingEvents
            .filter(e => e.type === 'CONTRIBUTION')
            .map((e, idx) => {
                const contribution = e as Extract<GovernanceEvent, { type: 'CONTRIBUTION' }>;
                return {
                    id: `ids-${contribution.timestamp}-${idx}`,
                    type: (contribution.lensId as IDSCard['type']) || 'freeform',
                    content: contribution.contentSummary || 'Contribution recorded.',
                    authorId: contribution.peerId,
                    timestamp: new Date(contribution.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    attachments: []
                };
            })
            .reverse();

        setIdsCardsFromStore(cards);
    }, [governingEvents, setIdsCardsFromStore]);

    useEffect(() => {
        const handleIdsAdded = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            const { type, content } = detail;
            setGoverningEvents(prev => {
                const ev = createHardenedEvent('CONTRIBUTION', {
                    peerId: 'p1',
                    lensId: type,
                    contentSummary: content
                });
                return [...prev, ev];
            });
        };

        window.addEventListener('ids-card-added', handleIdsAdded);
        return () => window.removeEventListener('ids-card-added', handleIdsAdded);
    }, [createHardenedEvent]);

    const handleChat = useCallback(async (text: string) => {
        if (!currentSession) return;
        const targetPeers = registryPeers.filter(p => p.type === 'ai' && (selectedChatPeerIds.length === 0 || selectedChatPeerIds.includes(p.id)));

        setIsChatting(true);
        try {
            for (const peer of targetPeers) {
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
                        apiKey: vaultKeys[peer.provider as string],
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
    }, [currentSession, registryPeers, selectedChatPeerIds, vaultKeys, createHardenedEvent]);

    const handleChatFromStream = useCallback(async (type: IDSCard['type'], text: string) => {
        addCard(type, text);
        return handleChat(text);
    }, [addCard, handleChat]);

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
            ...DEFAULT_DOMAIN_LENSES,
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

    return (
        <div className="flex flex-col h-screen bg-background-dark text-white overflow-hidden font-inter antialiased">
            {/* Top Navigation / Header */}
            <div className="h-14 flex items-center justify-between px-6 bg-background-dark/30 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    {isEditingMetadata ? (
                        <div className="flex items-center gap-2">
                            <input
                                title="Artifact Title"
                                className="bg-neutral-dark border border-neutral-border rounded px-3 py-0.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                value={tempMetadata.title}
                                onChange={(e) => setTempMetadata(prev => ({ ...prev, title: e.target.value }))}
                            />
                            <Button
                                title="Save Title"
                                size="sm"
                                className="h-6 w-6"
                                onClick={() => { setArtifactMetadata(tempMetadata); setIsEditingMetadata(false); }}
                            >
                                <Check className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Active Artifact</h2>
                            <span className="text-xs font-bold text-white tracking-tight">{artifactMetadata.title}</span>
                            <Button
                                title="Edit Title"
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-primary"
                                onClick={() => { setTempMetadata(artifactMetadata); setIsEditingMetadata(true); }}
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/5 shadow-inner">
                    <button
                        onClick={() => setActiveTab('whiteboard')}
                        className={cn(
                            "px-6 py-1 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-300",
                            activeTab === 'whiteboard'
                                ? "bg-primary text-background-dark shadow-[0_0_10px_rgba(19,236,218,0.3)]"
                                : "text-white/40 hover:text-white"
                        )}
                    >
                        Whiteboard
                    </button>
                    <button
                        onClick={() => setActiveTab('reflection')}
                        className={cn(
                            "px-6 py-1 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-300",
                            activeTab === 'reflection'
                                ? "bg-primary text-background-dark shadow-[0_0_10px_rgba(19,236,218,0.3)]"
                                : "text-white/40 hover:text-white"
                        )}
                    >
                        Reflection
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <GatewayStatus />
                    <Button
                        variant="ghost"
                        className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-destructive transition-colors h-8 px-4"
                        onClick={handleCloseSession}
                    >
                        Close Session
                    </Button>
                </div>
            </div>

            {/* Main Workspace Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Artifact & Stream */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-hidden">
                    <div className="flex-1 overflow-hidden relative">
                        {isChatting && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
                                <div className="bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold px-4 py-1.5 rounded-full border border-primary/30 shadow-[0_0_20px_rgba(19,236,218,0.2)] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    AI PEERS PROCESSING...
                                </div>
                            </div>
                        )}

                        {activeTab === 'whiteboard' ? (
                            <WhiteboardArea
                                focusNodeId={focusNodeId}
                                onNodesReady={handleNodesReady}
                            />
                        ) : (
                            <div className="h-full overflow-y-auto p-8 bg-background-dark/20 custom-scrollbar">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Governance Ledger</h3>
                                        <div className="h-0.5 flex-1 mx-4 bg-gradient-to-r from-primary/20 to-transparent"></div>
                                    </div>
                                    <div className="space-y-4">
                                        {governingEvents.length === 0 ? (
                                            <div className="glass-panel p-8 rounded-xl border border-white/5 text-center">
                                                <p className="text-white/20 text-xs italic">No stability markers recorded yet.</p>
                                            </div>
                                        ) : (
                                            governingEvents.slice().reverse().map((event, idx) => (
                                                <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <span className="text-[10px] font-mono text-white/30">{event.timestamp_utc}</span>
                                                        <span className={cn(
                                                            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                                                            event.type === 'LOCK_REQUEST' ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/5 text-white/40 border border-white/10"
                                                        )}>
                                                            {event.type.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-white/80 leading-relaxed font-inter">
                                                        {event.type === 'LOCK_REQUEST' ? (
                                                            <pre className="whitespace-pre-wrap font-mono text-primary/80 bg-primary/5 p-4 rounded-lg border border-primary/10">
                                                                {event.rationale || 'Stability Marker Locked.'}
                                                            </pre>
                                                        ) : (
                                                            <div className="p-3 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors">
                                                                <p className="text-white/60 mb-1">
                                                                    {('peerId' in event && event.peerId) && (
                                                                        <span className="font-bold text-white/80 mr-2">{event.peerId}:</span>
                                                                    )}
                                                                    {'contentSummary' in event ? event.contentSummary : 
                                                                     'prompt' in event ? event.prompt : 
                                                                     'responseText' in event ? event.responseText : 
                                                                     'error' in event ? event.error : 
                                                                     'Marker synchronized.'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* IDS Stream Bottom Feed */}
                    <div className="h-48 border-t border-white/10 shrink-0">
                        <IDSStream
                            cards={idsCardsFromStore}
                            nodes={canvasNodes}
                            onAttach={attachNode}
                            onRemoveAttachment={removeAttachment}
                            onFocusNode={setFocusNode}
                            onSend={handleChatFromStream}
                        />
                    </div>
                </div>

                {/* Right Column: Telemetry */}
                <aside className="w-80 bg-background-dark/50 shrink-0 overflow-y-auto border-l border-white/10">
                    <TelemetryPanel
                        telemetry={telemetry}
                        peers={currentPeers}
                        onInvokeLens={handleInvokeLens}
                        onDeferLens={handleDeferLens}
                        onAcknowledge={handleAcknowledge}
                        onLockVersion={handleLockVersion}
                    />
                </aside>
            </div>

            {/* Overlays */}
            {displacedSnapshot && (
                <div className="fixed inset-0 bg-background-dark/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="max-w-md glass-panel p-8 rounded-2xl border border-primary/20 text-center space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                            <span className="material-symbols-outlined text-primary text-3xl font-variation-icon-fill">history</span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">Session Displaced</h2>
                            <p className="text-white/40 text-[11px] leading-relaxed uppercase tracking-wider">
                                A Stability Snapshot was captured at <span className="text-primary font-mono">{displacedSnapshot.time}</span>.
                                This session is active in another protocol instance.
                            </p>
                        </div>
                        <button
                            className="w-full py-3 bg-primary text-background-dark rounded font-bold text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(19,236,218,0.2)]"
                            onClick={() => {
                                setGoverningEvents(displacedSnapshot.events);
                                setActiveTab('reflection');
                                setDisplacedSnapshot(null);
                            }}
                        >
                            View Last Snapshot
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export { LOG_STORAGE_KEY, METADATA_KEY };
