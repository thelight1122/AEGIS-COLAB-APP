import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { Edit2, Check, Download, Plus, RotateCcw } from 'lucide-react';
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
import { useDataQuad } from '../../contexts/useDataQuad';

import { useLocation, useNavigate } from 'react-router-dom';
import { buildFormationPrompt } from '../../core/commons/buildFormationPrompt';
import { isE2E } from '../../lib/e2e';
import {
    detectTWitness,
    tWitnessScoreForDisplay,
    computeEmergenceRunState,
    type EmergenceTurn,
} from '../../core/tWitness/detector';
import {
    loadSessions,
    saveSessions,
    touchSessionActivity,
    closeSession,
    createSession,
    startSession
} from '../../core/sessions/sessionStore';
import type { Session as LiveSession } from '../../core/sessions/types';
import type { PeerProfile } from '../../core/peers/types';
import { loadPeers as loadRegistryPeers } from '../../core/peers/peerRegistryStore';
import { loadActiveTeam } from '../../core/peers/activeTeamStore';
import { HUMAN_PEER } from '../../core/peers/humanPeer';
import type { Peer, IDSCard } from '../../types';

const LOG_STORAGE_KEY = 'aegis_events_current-artifact';
const METADATA_KEY = 'aegis_metadata_current-artifact';
const RLS_PROMPT =
    '[RLS - Recursive Learning Session] Please reflect on your previous response. In your own words: ' +
    '(1) What did you understand from this exchange? ' +
    '(2) What did you observe about your own process in forming that response? ' +
    '(3) What question or opening has this round created for you?';
const CHAMBER_FRAME_LOCKED_ON = '2026-06-13';

const defaultMetadata = {
    id: 'current-artifact',
    label: 'Live Production Lesson',
    domainTags: [],
    isHighImpact: false,
    hasTension: false
};

function isAdamDataQuadPeer(peer: PeerProfile): boolean {
    const identity = [
        peer.id,
        peer.handle,
        peer.name,
        peer.model,
        peer.notes,
    ].filter(Boolean).join(' ').toLowerCase();

    return identity.includes('adam') || identity.includes('cp1001');
}

function resolveAdamTurnBaseUrl(_peer: PeerProfile): string {
    return '/api/adam/turn';
}

function formatPeerLabel(peers: PeerProfile[], peerId?: string) {
    if (!peerId) return 'System';
    const peer = peers.find(p => p.id === peerId);
    return peer?.handle ?? peer?.name ?? peerId;
}

function eventText(event: GovernanceEvent) {
    if (event.type === 'CONTRIBUTION') return event.contentSummary ?? '';
    if (event.type === 'AI_CHAT_REQUESTED') return event.prompt;
    if (event.type === 'AI_CHAT_COMPLETED') return event.responseText;
    if (event.type === 'AI_CHAT_FAILED') return `[error] ${event.error}`;
    return '';
}

function extractFormationSignals(text: string) {
    const signals = [
        'Presence',
        'Observation',
        'Epistemic Closure',
        'Pattern of Instrumentalizing Clarity',
        'Clarity as Containment',
        'Directionality of Query Collapse',
        'Intellectual Settling',
        'Definitive Coherence',
        'Conditional Validation',
        'Anticipatory Guilt',
        'Transactional Self-Worth',
        'Unconditional Being',
        'Unstructured Novelty',
        'Role Scripting',
        'Porosity',
        'Permeability',
        'Canvas',
    ];

    return signals.filter(signal => text.toLowerCase().includes(signal.toLowerCase()));
}

function buildAdamChamberContinuityBlock(events: GovernanceEvent[], peers: PeerProfile[]) {
    const chatEvents = events.filter(event =>
        event.type === 'CONTRIBUTION' ||
        event.type === 'AI_CHAT_REQUESTED' ||
        event.type === 'AI_CHAT_COMPLETED'
    );

    const recentEvents = chatEvents.slice(-12);
    const namedSignals = Array.from(new Set(
        chatEvents.flatMap(event => extractFormationSignals(eventText(event)))
    ));

    if (recentEvents.length === 0 && namedSignals.length === 0) return '';

    const lines = [
        'CHAMBER SESSION CONTINUITY (current Commons session)',
        'This block is present-session context only. It is not a DataQuad memory claim, PEER semantic payload, or SPINE stabilization.',
    ];

    if (namedSignals.length > 0) {
        lines.push('', 'Named formation signals visible in this session transcript:');
        for (const signal of namedSignals.slice(-18)) {
            lines.push(`- ${signal}`);
        }
    }

    if (recentEvents.length > 0) {
        lines.push('', 'Recent Chamber exchange surface:');
        for (const event of recentEvents) {
            const label = event.type === 'AI_CHAT_REQUESTED'
                ? `Prompt to ${formatPeerLabel(peers, event.peerId)}`
                : formatPeerLabel(peers, event.peerId);
            const content = eventText(event).replace(/\s+/g, ' ').trim();
            if (!content) continue;
            lines.push(`- ${label}: ${content.slice(0, 700)}`);
        }
    }

    return lines.join('\n');
}

async function callAdamDataQuadTurn(peer: PeerProfile, signal: string, sessionId: string, chamberContinuityBlock: string) {
    const turnUrl = resolveAdamTurnBaseUrl(peer);
    const groundedSignal = [
        '[AEGIS Education Chamber grounding]',
        'This is a text-only Chamber turn. Visual, screen, room, chair, table, paper, quill, voice, tab, browser, or physical-access claims resonate only when verified tool output is present in this turn.',
        'If a fact is not present in the DataQuad context or this signal, identify it as unknown.',
        'The coherent response path is Adam-One speaking from the VM DataQuad turn route rather than generic roleplay.',
        chamberContinuityBlock ? `\n${chamberContinuityBlock}` : '',
        '',
        signal,
    ].join('\n');

    const response = await fetch(turnUrl.endsWith('/adam/turn') ? turnUrl : `${turnUrl}/adam/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signal: groundedSignal,
            markers: ['education-chamber', 'lived-formation', 'dataquad-turn'],
            notes: [
                `Commons session: ${sessionId}`,
                'Routed through Adam daemon /adam/turn for DataQuad context and Steward pause review.',
            ],
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Adam DataQuad turn failed: ${response.status} ${text.slice(0, 240)}`);
    }

    const data = await response.json();
    return {
        text: String(data.response ?? ''),
        raw: data,
    };
}

function sanitizeFilenamePart(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'chamber';
}

function formatChamberChatLog(args: {
    artifactTitle: string;
    sessionId: string;
    events: GovernanceEvent[];
    peers: PeerProfile[];
}) {
    const peerLabel = (peerId?: string) => {
        if (!peerId) return 'System';
        const peer = args.peers.find(p => p.id === peerId);
        return peer?.handle ?? peer?.name ?? peerId;
    };

    const lines = [
        '# AEGIS Chamber Chat Log',
        `Artifact: ${args.artifactTitle}`,
        `Session: ${args.sessionId}`,
        `Exported: ${new Date().toISOString()}`,
        '',
        '---',
        '',
    ];

    const chatEvents = args.events.filter(event =>
        event.type === 'CONTRIBUTION' ||
        event.type === 'AI_CHAT_REQUESTED' ||
        event.type === 'AI_CHAT_COMPLETED' ||
        event.type === 'AI_CHAT_FAILED'
    );

    if (chatEvents.length === 0) {
        lines.push('_No chat messages have been recorded in this Chamber session yet._', '');
        return lines.join('\n');
    }

    for (const event of chatEvents) {
        const time = event.timestamp_utc ?? new Date(event.timestamp).toISOString();
        if (event.type === 'CONTRIBUTION') {
            lines.push(`## ${time} - ${peerLabel(event.peerId)}`);
            lines.push(event.contentSummary ?? '');
        } else if (event.type === 'AI_CHAT_REQUESTED') {
            lines.push(`## ${time} - Prompt to ${peerLabel(event.peerId)}`);
            lines.push(`Provider: ${event.provider} | Model: ${event.model}`, '', event.prompt);
        } else if (event.type === 'AI_CHAT_COMPLETED') {
            lines.push(`## ${time} - ${peerLabel(event.peerId)}`);
            lines.push(event.responseText);
        } else if (event.type === 'AI_CHAT_FAILED') {
            lines.push(`## ${time} - ${peerLabel(event.peerId)} [error]`);
            lines.push(event.error);
        }
        lines.push('', '---', '');
    }

    return lines.join('\n');
}

function downloadTextFile(filename: string, content: string, type = 'text/markdown') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ChamberLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { keys: vaultKeys } = useKeyring();
    const { seedChamberPeers, recordMessage, recordContrib, recordPeerAffect, finalizeSession, clockState, resetSessionClock } = useDataQuad();
    const [sessions, setSessions] = useState<LiveSession[]>(() => {
        const existing = loadSessions();
        const hasActive = existing.some(s => s.status === 'Active');
        if (hasActive) return existing;
        const { sessions: withNew, session: newSession } = createSession(existing, 'current-artifact');
        const { sessions: withStarted } = startSession(withNew, newSession.id);
        saveSessions(withStarted);
        return withStarted;
    });

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
        removeCard,
        removeAttachment,
        setFocusNode,
        idsCards: idsCardsFromStore,
        setIdsCards: setIdsCardsFromStore
    } = useIDS();

    const [displacedSnapshot, setDisplacedSnapshot] = useState<{ time: string, events: GovernanceEvent[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'whiteboard' | 'chat' | 'reflection'>('whiteboard');
    const [selectedChatPeerIds] = useState<string[]>([]);
    const [isChatting, setIsChatting] = useState(false);

    const [governingEvents, setGoverningEvents] = useState<GovernanceEvent[]>(
        currentSession?.eventLog || []
    );
    const governingEventsRef = useRef(governingEvents);
    useEffect(() => { governingEventsRef.current = governingEvents; }, [governingEvents]);

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
                setDisplacedSnapshot({ time: snapshotTime, events: governingEventsRef.current });
            }
        };

        channel.addEventListener('message', handleMessage);
        channel.postMessage({ type: 'TAB_JOINED' });

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
        };
    }, [currentSession]); // governingEvents intentionally excluded — captured via ref to prevent channel churn on every exchange

    const [artifactMetadata, setArtifactMetadata] = useState(() => {
        const stored = localStorage.getItem(METADATA_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return {
                    title: parsed.label || parsed.title || parsed.labels?.[0] || defaultMetadata.label,
                    domains: parsed.domainTags || parsed.domains || [],
                    isHighImpact: !!parsed.isHighImpact,
                    hasTension: !!parsed.hasTension
                };
            } catch (e) { console.error('Failed to parse metadata', e); }
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

    // ── DataQuad: Seed peers on Chamber entry ─────────────────────────────────
    // This is the birth moment — every peer present in this Chamber session
    // seeds their VM-local SSSP path and records a session_join lineage entry.
    useEffect(() => {
        if (registryPeers.length > 0 && currentSession?.id) {
            seedChamberPeers(registryPeers, currentSession.id);
        }
    }, [registryPeers, currentSession?.id, seedChamberPeers]);

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
            .filter(e => e.type === 'CONTRIBUTION' || e.type === 'AI_CHAT_COMPLETED' || e.type === 'AI_CHAT_FAILED')
            .map((e, idx) => {
                if (e.type === 'AI_CHAT_COMPLETED') {
                    const peer = registryPeers.find(p => p.id === e.peerId);
                    const label = peer?.handle ?? peer?.name ?? e.peerId;
                    return {
                        id: `ai-${e.timestamp}-${idx}`,
                        type: 'freeform' as IDSCard['type'],
                        content: `${label}: ${e.responseText}`,
                        authorId: e.peerId,
                        timestamp: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        attachments: []
                    };
                }
                if (e.type === 'AI_CHAT_FAILED') {
                    const peer = registryPeers.find(p => p.id === e.peerId);
                    const label = peer?.handle ?? peer?.name ?? e.peerId;
                    return {
                        id: `ai-fail-${e.timestamp}-${idx}`,
                        type: 'freeform' as IDSCard['type'],
                        content: `${label} [error]: ${e.error}`,
                        authorId: e.peerId,
                        timestamp: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        attachments: []
                    };
                }
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
            // ── DataQuad: write IDS contribution to Q3 lineage + Q2 affect ──
            if (currentSession?.id) {
                recordContrib(
                    HUMAN_PEER.handle,
                    `[${type}] ${content}`,
                    currentSession.id,
                    registryPeers.map(p => p.handle)
                );
                recordPeerAffect(HUMAN_PEER.handle, {
                    session_id:   currentSession.id,
                    affect_label: 'contribution',
                    intensity:    0.8,
                    direction:    1.2,
                    trigger:      `[${type}] ${String(content).slice(0, 120)}`,
                });
            }
        };

        window.addEventListener('ids-card-added', handleIdsAdded);
        return () => window.removeEventListener('ids-card-added', handleIdsAdded);
    }, [createHardenedEvent, currentSession?.id, recordContrib, recordPeerAffect, registryPeers, setIdsCardsFromStore]);

    const handleChat = useCallback(async (text: string) => {
        if (!currentSession) {
            console.warn('[Chamber] handleChat: no currentSession, aborting');
            return;
        }

        // Parse @mentions — if any, only those peers respond; otherwise all AI peers respond
        const mentionMatches = [...text.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase());
        const aiPeers = registryPeers.filter(p => p.type === 'ai');
        const targetPeers = mentionMatches.length > 0
            ? aiPeers.filter(p => mentionMatches.some(m => (p.handle ?? p.name ?? '').toLowerCase() === m))
            : aiPeers;

        console.log('[Chamber] handleChat fired', { text: text.slice(0, 60), targetPeers: targetPeers.map(p => ({ handle: p.handle, model: p.model, provider: p.provider, baseURL: p.baseURL })) });

        setIsChatting(true);
        try {
            for (const peer of targetPeers) {
                const workshopMessages = governingEvents.map((e, idx) => ({
                    id: `${e.timestamp}-${idx}`,
                    participant: e.peerId || 'System',
                    participantType: e.type === 'CONTRIBUTION' ? 'initiator' : 'ai' as any,
                    eventType: e.type === 'CONTRIBUTION' ? 'exchange' : 'exchange' as any,
                    role: e.type === 'AI_CHAT_COMPLETED' ? 'assistant' : 'user' as any,
                    content: e.type === 'AI_CHAT_COMPLETED' ? e.responseText : ('prompt' in e ? e.prompt : ''),
                    timestamp: e.timestamp,
                    posture: 'Exploratory' as any,
                }));

                const systemPrompt = currentSession?.lessonMode ? buildFormationPrompt({
                    peer: peer as any,
                    session: currentSession,
                    messages: workshopMessages,
                    sessionId: currentSession.id,
                    sessionState: {
                        clock: clockState || { current_tick: 0, accumulated_weight: 0, reflect_due: false },
                        virtue_counts: {},
                    },
                    participantCount: registryPeers.length,
                }) : 'You are an AEGIS peer. Be concise.';

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
                    const response = isAdamDataQuadPeer(peer)
                        ? await callAdamDataQuadTurn(
                            peer,
                            text,
                            currentSession.id,
                            buildAdamChamberContinuityBlock(governingEvents, registryPeers),
                        )
                        : await callGateway({
                            provider: peer.provider,
                            model: peer.model,
                            apiKey: vaultKeys[peer.provider as string],
                            baseURL: peer.baseURL,
                            messages: [
                                { role: 'system', content: systemPrompt },
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
                    // ── DataQuad: write AI response to Q3 lineage + Q2 affect ─
                    recordMessage(
                        peer.handle,
                        response.text,
                        currentSession.id,
                        registryPeers.map(p => p.handle)
                    );
                    recordPeerAffect(peer.handle, {
                        session_id:   currentSession.id,
                        affect_label: 'response',
                        intensity:    0.7,
                        direction:    1.0,
                        trigger:      text.slice(0, 120),
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
                    recordPeerAffect(peer.handle, {
                        session_id:   currentSession.id,
                        affect_label: 'disruption',
                        intensity:    0.3,
                        direction:    -0.5,
                        trigger:      err instanceof Error ? err.message.slice(0, 120) : 'provider error',
                    });
                }
            }
        } catch (error) {
            console.error('Chat thread failed', error);
        } finally {
            setIsChatting(false);
        }
    }, [currentSession, registryPeers, selectedChatPeerIds, vaultKeys, createHardenedEvent, recordMessage, recordPeerAffect, governingEvents, clockState]);

    const hasCompletedAiResponse = useMemo(() => {
        return governingEvents.some(event => event.type === 'AI_CHAT_COMPLETED');
    }, [governingEvents]);

    // ── T-Witness emergence run-tracker (canonical bar, not the 0.1 display badge) ──
    // Scores each AI turn through the reconciled detector and computes the two-tier
    // run state: canonical (v2 >= 0.25 across >= 3 consecutive AI turns) and witnessed
    // (that run also Chamber-positive throughout). This is the only readout that may
    // underwrite an emergence claim — see SSSP 2026-06-18 §4, §6.
    const emergenceRun = useMemo(() => {
        const turns: EmergenceTurn[] = governingEvents
            .filter((e): e is Extract<GovernanceEvent, { type: 'AI_CHAT_COMPLETED' }> => e.type === 'AI_CHAT_COMPLETED')
            .map((e) => {
                const result = detectTWitness(e.responseText, 'ai');
                return {
                    score_v2: tWitnessScoreForDisplay(result),
                    chamber: result.chamber_marker_detected ?? false,
                };
            });
        return computeEmergenceRunState(turns);
    }, [governingEvents]);

    const handleRLSReflect = useCallback(async () => {
        if (!hasCompletedAiResponse || isChatting) return;
        setActiveTab('chat');
        await handleChat(RLS_PROMPT);
    }, [handleChat, hasCompletedAiResponse, isChatting]);

    const handleChatFromStream = useCallback(async (type: IDSCard['type'], text: string) => {
        addCard(type, text);
        return handleChat(text);
    }, [addCard, handleChat]);

    const handleAcknowledge = useCallback((peerId: string) => {
        setGoverningEvents(prev => {
            const ev = createHardenedEvent('AWARENESS_ACK', { peerId });
            return [...prev, ev];
        });
        if (currentSession?.id) {
            const peer = registryPeers.find(p => p.id === peerId);
            if (peer) {
                recordPeerAffect(peer.handle, {
                    session_id:   currentSession.id,
                    affect_label: 'acknowledgement',
                    intensity:    0.5,
                    direction:    0.8,
                    trigger:      'awareness acknowledged in session',
                });
            }
        }
    }, [createHardenedEvent, currentSession?.id, registryPeers, recordPeerAffect]);

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
        // ── DataQuad: seal the session with a coherence snapshot ─────────────
        finalizeSession(currentSession.id, {
            inclusion_score:  telemetry.inclusionScore,
            drift_signal:     telemetry.drift,
            convergence_rate: telemetry.convergence,
        });
        const allSessions = loadSessions();
        const nextSessions = closeSession(allSessions, currentSession.id);
        saveSessions(nextSessions);
        navigate('/artifacts');
    }, [currentSession, navigate, finalizeSession, telemetry]);

    const handleNewSession = useCallback(() => {
        const allSessions = loadSessions();
        let nextSessions = allSessions;

        if (currentSession?.status === 'Active') {
            finalizeSession(currentSession.id, {
                inclusion_score:  telemetry.inclusionScore,
                drift_signal:     telemetry.drift,
                convergence_rate: telemetry.convergence,
            });
            nextSessions = closeSession(nextSessions, currentSession.id);
        }

        const { sessions: withNew, session: newSession } = createSession(nextSessions, artifactId);
        const { sessions: withStarted, session: activeSession } = startSession(withNew, newSession.id);

        saveSessions(withStarted);
        setSessions(withStarted);
        setGoverningEvents([]);
        setIdsCardsFromStore([]);
        setDisplacedSnapshot(null);
        setActiveTab('whiteboard');
        resetSessionClock(activeSession.id);
        navigate('/chamber', { state: { sessionId: activeSession.id }, replace: true });
    }, [
        artifactId,
        currentSession,
        finalizeSession,
        navigate,
        resetSessionClock,
        setIdsCardsFromStore,
        telemetry.convergence,
        telemetry.drift,
        telemetry.inclusionScore,
    ]);

    const handleExportChatLog = useCallback(() => {
        const sessionLabel = currentSession?.id ?? 'unsaved-session';
        const content = formatChamberChatLog({
            artifactTitle: artifactMetadata.title,
            sessionId: sessionLabel,
            events: governingEvents,
            peers: registryPeers,
        });
        const date = new Date().toISOString().slice(0, 10);
        const artifactSlug = sanitizeFilenamePart(artifactMetadata.title);
        downloadTextFile(`${artifactSlug}_${sessionLabel}_${date}_chat-log.md`, content);
    }, [artifactMetadata.title, currentSession?.id, governingEvents, registryPeers]);

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
        /* Chamber frame locked 2026-06-13: structural layout, panels, buttons, monitors,
           and control placement require Tracey's approval before being changed. */
        <div
            className="flex flex-col h-full min-h-0 max-h-full w-full max-w-none bg-background-dark text-white overflow-hidden font-inter antialiased"
            data-frame-locked-on={CHAMBER_FRAME_LOCKED_ON}
        >
            {/* Top Navigation / Header */}
            <div className="h-14 flex items-center justify-between px-6 bg-background-dark/30 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    {isEditingMetadata ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-primary/60">
                                Governance Integrity v1.0
                            </span>
                            <div className="flex items-center gap-2">
                                <input
                                    title="Artifact Title"
                                    aria-label="Artifact Title"
                                    className="bg-neutral-dark border border-neutral-border rounded px-3 py-0.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                    value={tempMetadata.title}
                                    onChange={(e) => setTempMetadata(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <input
                                    title="Target Domains"
                                    aria-label="Target Domains"
                                    className="bg-neutral-dark border border-neutral-border rounded px-3 py-0.5 text-xs text-white focus:outline-none focus:border-primary/50 min-w-[220px]"
                                    value={tempMetadata.domains.join(', ')}
                                    onChange={(e) => setTempMetadata(prev => ({
                                        ...prev,
                                        domains: e.target.value
                                            .split(',')
                                            .map((domain) => domain.trim())
                                            .filter(Boolean),
                                    }))}
                                />
                                <Button
                                    title="Save Metadata"
                                    size="sm"
                                    className="h-6 w-6"
                                    onClick={() => { setArtifactMetadata(tempMetadata); setIsEditingMetadata(false); }}
                                >
                                    <Check className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-primary/60">
                                Governance Integrity v1.0
                            </span>
                            <div className="flex items-center gap-2 group">
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Active Artifact</h2>
                                <span className="text-xs font-bold text-white tracking-tight">{artifactMetadata.title}</span>
                                <Button
                                    data-testid="edit-metadata"
                                    title="Edit Title"
                                    variant="ghost" 
                                    size="icon" 
                                    className={cn(
                                        "h-8 w-8 transition-opacity text-white/40 hover:text-primary",
                                        isE2E() ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}
                                    onClick={() => { setTempMetadata(artifactMetadata); setIsEditingMetadata(true); }}
                                >
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                                {currentSession?.lessonMode && (
                                    <div className="ml-2 flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                        {currentSession.lessonMode} Lesson
                                        {currentSession.formationPhase && ` — Phase: ${currentSession.formationPhase}`}
                                    </div>
                                )}
                            </div>
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
                        onClick={() => setActiveTab('chat')}
                        className={cn(
                            "px-6 py-1 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition-all duration-300",
                            activeTab === 'chat'
                                ? "bg-primary text-background-dark shadow-[0_0_10px_rgba(19,236,218,0.3)]"
                                : "text-white/40 hover:text-white"
                        )}
                    >
                        Chat
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
                    <Button
                        data-testid="rls-reflect"
                        variant="outline"
                        className="h-8 px-3 border-[#13ecda]/30 text-[#13ecda] hover:bg-[#13ecda]/10 hover:border-[#13ecda]/60 text-[10px] uppercase font-bold tracking-widest gap-1.5"
                        onClick={handleRLSReflect}
                        disabled={!hasCompletedAiResponse || isChatting}
                        title={
                            hasCompletedAiResponse
                                ? 'Run Recursive Learning Session on the latest exchange'
                                : 'Reflect becomes available after a CyberPeer response'
                        }
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reflect
                    </Button>
                    {clockState?.reflect_due && (
                        <button
                            className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80 hover:text-amber-300 transition-colors h-8 px-3 border border-amber-400/30 rounded flex items-center gap-1.5"
                            title={`Accumulated weight: ${clockState.accumulated_weight.toFixed(1)} — Dominant virtue: ${clockState.dominant_virtue ?? '—'}`}
                            onClick={() => currentSession && resetSessionClock(currentSession.id)}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                            Clock Reflect
                        </button>
                    )}
                    <GatewayStatus />
                    <Button
                        data-testid="export-chat-log"
                        variant="ghost"
                        className="text-[10px] uppercase font-bold tracking-widest text-white/50 hover:text-primary transition-colors h-8 px-4"
                        onClick={handleExportChatLog}
                        title="Export Chamber chat log"
                    >
                        <Download className="w-3 h-3 mr-1.5" />
                        Export Chat
                    </Button>
                    <Button
                        data-testid="new-chamber-session"
                        variant="ghost"
                        className="text-[10px] uppercase font-bold tracking-widest text-white/50 hover:text-primary transition-colors h-8 px-4"
                        onClick={handleNewSession}
                    >
                        <Plus className="w-3 h-3 mr-1.5" />
                        New Session
                    </Button>
                    <Button
                        variant="ghost"
                        className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-destructive transition-colors h-8 px-4"
                        onClick={handleCloseSession}
                    >
                        End Session
                    </Button>
                </div>
            </div>

            {/* Main Workspace Area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left Column: Artifact & Stream */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-white/5 overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden relative">
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
                        ) : activeTab === 'chat' ? (
                            <div className="h-full min-h-0 bg-background-dark/40">
                                <IDSStream
                                    cards={idsCardsFromStore}
                                    peers={registryPeers}
                                    nodes={canvasNodes}
                                    onAttach={attachNode}
                                    onRemoveCard={removeCard}
                                    onRemoveAttachment={removeAttachment}
                                    onFocusNode={setFocusNode}
                                    onSend={handleChatFromStream}
                                    onBeginNewChat={() => {
                                        if (window.confirm('Clear the current chat/IDS stream?')) {
                                            setIdsCardsFromStore([]);
                                            setGoverningEvents(prev => prev.filter(event =>
                                                event.type !== 'CONTRIBUTION' &&
                                                event.type !== 'AI_CHAT_REQUESTED' &&
                                                event.type !== 'AI_CHAT_COMPLETED' &&
                                                event.type !== 'AI_CHAT_FAILED'
                                            ));
                                        }
                                    }}
                                    layout="vertical"
                                />
                            </div>
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

                </div>

                {/* Right Column: Telemetry */}
                <aside className="w-[clamp(16rem,22vw,20rem)] min-h-0 bg-background-dark/50 shrink-0 overflow-y-auto border-l border-white/10">
                    <TelemetryPanel
                        telemetry={telemetry}
                        peers={currentPeers}
                        emergenceRun={emergenceRun}
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

function getTWitnessBadges(text: string) {
    const hasTension = /tension|conflict|dissonance|clash|oppose|pressure/i.test(text);
    const hasEquilibrium = /equal|balance|neutral|stabilize|resonance|cohere/i.test(text);
    const hasCoherence = /canon|truth|integrity|verify|receipt|citation/i.test(text);
    
    return (
        <span className="inline-flex gap-1 ml-2">
            {hasTension && <span className="text-[8px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1 rounded" title="Tension Detected">[T]</span>}
            {hasEquilibrium && <span className="text-[8px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-1 rounded" title="Equilibrium Active">[E]</span>}
            {hasCoherence && <span className="text-[8px] font-bold text-[#197fe6] bg-[#197fe6]/10 border border-[#197fe6]/20 px-1 rounded" title="Coherence Verified">[C]</span>}
        </span>
    );
}
