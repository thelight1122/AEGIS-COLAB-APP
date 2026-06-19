import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CommonsContext } from './CommonsContextBase';
import type {
    ConnectedModel,
    CommonsSessionOverview,
    CustodialPulse,
    ExplorationPhase,
    ModelProvider,
    WorkshopMessage,
} from '../types/commons';
import { useDataQuad } from './useDataQuad';
import { useKeyring } from './KeyringContext';
import {
    analyzeOrientationResponse,
    buildParticipantHandles,
    buildPeerProfiles,
    collectResidualPatterns,
    computeExplorationPhase,
    inferAffectHint,
    resolvePeerForModel,
    updateOrientationForModel,
    summarizeCommonsSession,
} from '../core/commons/session';
import { parseIntendedRecipient, type TurnTarget } from '../core/commons/routingDaemon';
import { runPipeline, type SessionState, type StewardReport, type ExchangeMessage } from '../../server/steward-core';
import { getEntry as getBookcaseEntry } from '../../server/bookcase.js';
import { resetClock } from '../core/governance/integrityClock';
import { createVerifiedOrientation, markOrientationStale } from '../core/peers/orientation';
import { loadPeers, savePeers } from '../core/peers/peerRegistryStore';
import { loadActiveTeam } from '../core/peers/activeTeamStore';
import { readPeerContext, type PeerContextRead } from '../services/dataquad';
import { validateParticipantRuntime } from '../core/providers/substrateInterfaceValidation';
import { TurnCoordinator, type CoordinatorCallbacks } from '../core/commons/coordinator';
import { loadSessions, saveSessions } from '../core/sessions/sessionStore';
import type { Session } from '../core/sessions/types';

const EMPTY_OVERVIEW: CommonsSessionOverview = {
    exchangeCount: 0,
    participantCount: 1,
    aiTurnCount: 0,
    activeAlerts: 0,
    averageResonance: 0,
    currentPosition: 0,
    lastVerdict: 'RELEASE',
    lastSoulQuality: 'Present',
    lastPosture: 'Exploratory',
};

export function CommonsProvider({ children }: { children: React.ReactNode }) {
    const [connectedModels, setConnectedModels] = useState<ConnectedModel[]>([]);
    const [peerVersion, setPeerVersion] = useState(0);
    const [messages, setMessages] = useState<WorkshopMessage[]>([]);
    const [isWorkshopActive, setIsWorkshopActive] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [explorationPhase, setExplorationPhase] = useState<ExplorationPhase>('Clarifying');
    const [roundRobinOrder, setRoundRobinOrder] = useState<string[]>([]);
    const [currentTurnIndex, setCurrentTurnIndex] = useState<number | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [latestCustodialPulse, setLatestCustodialPulse] = useState<CustodialPulse | null>(null);
    const [latestCustodialReport, setLatestCustodialReport] = useState<StewardReport | null>(null);
    const [sessionOverview, setSessionOverview] = useState<CommonsSessionOverview>(EMPTY_OVERVIEW);
    const [currentActivePeerHandle, setCurrentActivePeerHandle] = useState<string | null>(null);
    const [turnQueue, setTurnQueue] = useState<TurnTarget[]>([]);
    const [daemonState, setDaemonState] = useState<'routing' | 'awaiting-human' | 'idle'>('idle');

    const sessionStateRef = useRef<SessionState | null>(null);
    const activeCoordinatorRef = useRef<TurnCoordinator | null>(null);
    const seededSessionIds = useRef<Set<string>>(new Set());
    const residualPatternCounts = useRef<Map<string, number>>(new Map());
    const promotedResiduals = useRef<Set<string>>(new Set());
    const messagesRef = useRef<WorkshopMessage[]>([]);

    const {
        seedChamberPeers,
        recordMessage,
        recordPeerAffect,
        setPeerWorkingMemory,
        recordPeerResidual,
        resetSessionClock,
        persistPeerEntry,
        persistSpineEntry,
        persistBookcaseEntry,
    } = useDataQuad();
    const { keys, status: keyringStatus } = useKeyring();

    const eligibleModels = useMemo(
        () => connectedModels.filter(model => model.status === 'Connected' && model.isSelected),
        [connectedModels],
    );

    useEffect(() => {
        const restoreId = window.setTimeout(() => {
            setConnectedModels(prev => {
                const peers = loadPeers().filter(peer => peer.type === 'ai' && peer.enabled);
                console.log('[Commons:restore] ai peers in registry:', peers.map(p => ({ handle: p.handle, provider: p.provider, model: p.model, baseURL: p.baseURL, enabled: p.enabled })));
                if (peers.length === 0) return prev;

                const peerById = new Map(peers.map(peer => [peer.id, peer]));
                const hydratedExisting = prev.map(model => {
                    const peer = peerById.get(model.id);
                    const vaultKey = keys[model.provider];
                    const endpointUrl = peer?.baseURL ?? model.endpointUrl;
                    const apiKey = model.apiKey || vaultKey;

                    if (apiKey === model.apiKey && endpointUrl === model.endpointUrl) {
                        return model;
                    }

                    return {
                        ...model,
                        apiKey,
                        endpointUrl,
                    };
                });

                if (hydratedExisting.length > 0) {
                    return hydratedExisting;
                }

                const activeTeam = loadActiveTeam();
                const selectedIds = activeTeam.selectedPeerIds;
                const selectedPeers = selectedIds.length > 0
                    ? peers.filter(peer => selectedIds.includes(peer.id))
                    : peers;

                const restored = selectedPeers
                    .filter(peer => {
                        if (peer.provider === 'lmstudio' || peer.provider === 'ollama') {
                            return Boolean(peer.model && peer.baseURL);
                        }
                        return Boolean(peer.model && keys[peer.provider]);
                    })
                    .map(peer => ({
                        id: peer.id,
                        peerId: peer.id,
                        handle: peer.handle,
                        facetId: peer.personaId,
                        dataQuad: peer.dataQuad,
                        systemPrompt: peer.systemPrompt,
                        contextFiles: peer.contextFiles,
                        provider: peer.provider,
                        model: peer.model,
                        apiKey: keys[peer.provider],
                        endpointUrl: peer.baseURL,
                        status: 'Connected' as const,
                        type: (peer.provider === 'lmstudio' || peer.provider === 'ollama') ? 'local' as const : 'hosted' as const,
                        isSelected: true,
                        isActive: true,
                    }));

                return restored.length > 0 ? restored : prev;
            });
        }, 0);

        return () => window.clearTimeout(restoreId);
    }, [keys, keyringStatus, peerVersion]);

    useEffect(() => {
        const handler = () => {
            setConnectedModels([]);
            setPeerVersion(v => v + 1);
        };
        window.addEventListener('aegis:peers-updated', handler);
        return () => window.removeEventListener('aegis:peers-updated', handler);
    }, []);

    const addModel = ({ provider, model, apiKey, endpointUrl, type }: {
        provider: ModelProvider;
        model: string;
        apiKey?: string;
        endpointUrl?: string;
        type: 'hosted' | 'local';
    }) => {
        const id = crypto.randomUUID();
        setConnectedModels(prev => [...prev, {
            id,
            provider,
            model,
            apiKey,
            endpointUrl,
            status: 'Not Connected',
            type,
            isSelected: true,
            isActive: true,
        }]);
    };

    const setModelSelection = (id: string, isSelected: boolean) => {
        setConnectedModels(prev => prev.map(model => model.id === id ? { ...model, isSelected } : model));
    };

    const setModelActivity = (id: string, isActive: boolean) => {
        setConnectedModels(prev => prev.map(model => model.id === id ? { ...model, isActive } : model));
    };

    const validateModel = async (id: string) => {
        setConnectedModels(prev => prev.map(model => model.id === id ? { ...model, status: 'Validating' } : model));
        const target = connectedModels.find(model => model.id === id);
        if (!target) return false;

        const result = await validateParticipantRuntime(target, keys[target.provider]);
        setConnectedModels(prev => prev.map(model => model.id === id ? {
            ...model,
            status: result.ok ? 'Connected' : 'Not Connected',
        } : model));
        if (!result.ok) {
            console.warn(`[Commons] substrate interface validation failed for ${target.provider}/${target.model}: ${result.reason}`);
        }
        return result.ok;
    };

    const ensureSession = (explicitSessionId?: string) => {
        const nextSessionId = explicitSessionId ?? sessionId ?? `CS-${crypto.randomUUID()}`;

        if (!sessionStateRef.current || sessionId !== nextSessionId) {
            sessionStateRef.current = {
                clock: resetClock(nextSessionId),
                virtue_counts: {},
            };
        }

        setSessionId(nextSessionId);
        resetSessionClock(nextSessionId);

        if (!seededSessionIds.current.has(nextSessionId)) {
            seededSessionIds.current.add(nextSessionId);
            const peers = buildPeerProfiles(eligibleModels, loadPeers());
            seedChamberPeers(peers, nextSessionId);
        }

        return nextSessionId;
    };

    const refreshDerivedState = (nextMessages: WorkshopMessage[], nextTurnIndex: number | null) => {
        messagesRef.current = nextMessages;
        setExplorationPhase(computeExplorationPhase(nextMessages));
        setSessionOverview(summarizeCommonsSession(nextMessages, nextTurnIndex, eligibleModels.length + 1));
        const latestPulse = [...nextMessages].reverse().find(message => message.custodialPulse)?.custodialPulse ?? null;
        const latestReport = [...nextMessages].reverse().find(message => message.report)?.report ?? null;
        setLatestCustodialPulse(latestPulse);
        setLatestCustodialReport(latestReport);
    };

    const appendMessage = (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => {
        const completeMessage: WorkshopMessage = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        const nextMessages = [...messagesRef.current, completeMessage];
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        refreshDerivedState(nextMessages, currentTurnIndex);
        playAudioCue();
    };

    const addMessage = (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => {
        appendMessage(message);
    };

    const enterWorkshop = (explicitSessionId?: string) => {
        if (eligibleModels.length > 0 || explicitSessionId) {
            setIsWorkshopActive(true);
            setRoundRobinOrder(eligibleModels.map(model => model.id));
            ensureSession(explicitSessionId);
            if (!explicitSessionId && !sessionId) {
                setMessages([]);
                messagesRef.current = [];
                refreshDerivedState([], null);
            }
        }
    };

    const playAudioCue = () => {
        if (!audioEnabled) return;
        try {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctx) return;
            const audioCtx = new Ctx();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (error) {
            console.error('Audio cue failed', error);
        }
    };

    const recordCommonsExchange = (handle: string, content: string, currentSessionId: string, models: ConnectedModel[], affectHint?: ReturnType<typeof inferAffectHint>) => {
        const allHandles = buildParticipantHandles(models, loadPeers());
        recordMessage(handle, content, currentSessionId, allHandles);
        if (affectHint) {
            recordPeerAffect(handle, {
                session_id: currentSessionId,
                affect_label: affectHint.label,
                intensity: affectHint.intensity,
                direction: affectHint.direction,
                trigger: affectHint.trigger,
            });
        }
    };

    const updatePeerPCT = (peerId: string, currentSessionId: string, content: string) => {
        setPeerWorkingMemory(peerId, currentSessionId, content);
    };

    const promoteResidualPatterns = (params: {
        peerHandle: string;
        currentSessionId: string;
        sourceTurnId: string;
        patterns: ReturnType<typeof collectResidualPatterns>;
    }) => {
        for (const pattern of params.patterns) {
            const recurrenceKey = `${params.currentSessionId}:${params.peerHandle}:${pattern.key}`;
            const nextCount = (residualPatternCounts.current.get(recurrenceKey) ?? 0) + 1;
            residualPatternCounts.current.set(recurrenceKey, nextCount);

            if (nextCount < 2 || promotedResiduals.current.has(recurrenceKey)) continue;

            promotedResiduals.current.add(recurrenceKey);
            recordPeerResidual(params.peerHandle, {
                pattern_key: pattern.key,
                label: pattern.label,
                valence: pattern.valence,
                summary: pattern.summary,
                source_kind: pattern.sourceKind,
                source_session_id: params.currentSessionId,
                source_turn_id: params.sourceTurnId,
                recurrence_count: nextCount,
            });
        }
    };

    const persistPeerOrientation = (updater: (peers: ReturnType<typeof loadPeers>) => ReturnType<typeof loadPeers>) => {
        const peers = loadPeers();
        const nextPeers = updater(peers);
        savePeers(nextPeers);
    };

    const resolveRegistryPeer = (model: ConnectedModel) => {
        return resolvePeerForModel(loadPeers(), model);
    };

    const performOrientationPreflight = async (model: ConnectedModel, currentSessionId: string): Promise<PeerContextRead | undefined> => {
        const peer = resolveRegistryPeer(model);
        if (!peer?.handle) return undefined;

        try {
            return await readPeerContext(peer.handle, currentSessionId);
        } catch (error) {
            console.warn(`[Commons] orientation preflight failed for ${peer.handle}:`, error);
            return undefined;
        }
    };

    const applyOrientationEvidence = (model: ConnectedModel, currentSessionId: string, responseText: string) => {
        const analysis = analyzeOrientationResponse(responseText);

        if (analysis.receipt) {
            persistPeerOrientation(peers => {
                return updateOrientationForModel(peers, model, createVerifiedOrientation({
                    source: 'peer_context',
                    facet: 'peer',
                    sessionId: currentSessionId,
                    receipt: analysis.receipt,
                    continuityVersion: analysis.continuityVersion,
                    notes: 'Peer supplied a READ_RECEIPT during Commons self-orientation.',
                }));
            });
            return {
                displayContent: analysis.cleanedContent || responseText.trim(),
                orientationStatus: 'verified' as const,
                orientationReceipt: analysis.receipt,
                orientationNotes: 'Verified through peer-context read receipt.',
            };
        }

        if (analysis.hasSelfOrientationClaim) {
            persistPeerOrientation(peers => {
                const targetPeer = resolvePeerForModel(peers, model);
                if (!targetPeer) return peers;
                return updateOrientationForModel(peers, model, markOrientationStale(
                    targetPeer.orientation,
                    'Peer made self-orientation claims without a current READ_RECEIPT. Treat identity statements as unverified until a fresh context read occurs.',
                ));
            });
            return {
                displayContent: responseText.trim(),
                orientationStatus: 'unverified' as const,
                orientationNotes: 'Self-orientation claims present without a valid READ_RECEIPT.',
            };
        }

        return {
            displayContent: responseText.trim(),
            orientationStatus: 'none' as const,
        };
    };

    const callbacksRef = useRef<CoordinatorCallbacks | null>(null);
    const callbacks: CoordinatorCallbacks = {
        onActivePeer: (handle) => {
            setCurrentActivePeerHandle(handle);
        },
        onMessage: (msg) => {
            appendMessage(msg);
        },
        onPreflight: async (model) => {
            const sId = ensureSession();
            return await performOrientationPreflight(model, sId);
        },
        onApplyEvidence: (model, text) => {
            const sId = ensureSession();
            return applyOrientationEvidence(model, sId, text);
        },
        onRunPipeline: async (content, role, affectHint) => {
            const sId = ensureSession();
            const state = sessionStateRef.current || {
                clock: resetClock(sId),
                virtue_counts: {},
            };
            const msg: ExchangeMessage = {
                type: 'EXCHANGE',
                session_id: sId,
                role,
                content,
                affect_hint: affectHint,
            };
            return await runPipeline(msg, state);
        },
        onPersistEntries: (report, handle) => {
            const sId = ensureSession();
            persistPeerEntry(sId, report.peer_entry, handle);
            if (report.promoter_result.promotion_threshold_crossed && report.promoter_result.spine_entry) {
                persistSpineEntry(report.promoter_result.spine_entry);
            }
            if (report.ate_result.verdict === 'HOLD' && report.bookcase_entry_id) {
                const entry = getBookcaseEntry(report.bookcase_entry_id);
                if (entry) {
                    persistBookcaseEntry(entry);
                }
            }
        },
        onRecordExchange: (handle, content, affectHint) => {
            const sId = ensureSession();
            recordCommonsExchange(handle, content, sId, eligibleModels, affectHint);
        },
        onUpdateWorkingMemory: (handle, content) => {
            const sId = ensureSession();
            updatePeerPCT(handle, sId, content);
        },
        onPromoteResiduals: (handle, turnId, patterns) => {
            const sId = ensureSession();
            promoteResidualPatterns({
                peerHandle: handle,
                currentSessionId: sId,
                sourceTurnId: turnId,
                patterns,
            });
        },
        onRetrieveKey: (provider) => {
            return keys[provider] || null;
        },
        onQueueChange: (queue) => {
            setTurnQueue(queue);
        },
    };
    callbacksRef.current = callbacks;

    if (!activeCoordinatorRef.current) {
        activeCoordinatorRef.current = new TurnCoordinator({
            onActivePeer: (h) => callbacksRef.current?.onActivePeer(h),
            onMessage: (m) => callbacksRef.current?.onMessage(m),
            onPreflight: (m) => callbacksRef.current!.onPreflight(m),
            onApplyEvidence: (m, t) => callbacksRef.current!.onApplyEvidence(m, t),
            onRunPipeline: (c, r, a) => callbacksRef.current!.onRunPipeline(c, r, a),
            onPersistEntries: (r, h) => callbacksRef.current?.onPersistEntries(r, h),
            onRecordExchange: (h, c, a) => callbacksRef.current?.onRecordExchange(h, c, a),
            onUpdateWorkingMemory: (h, c) => callbacksRef.current?.onUpdateWorkingMemory(h, c),
            onPromoteResiduals: (h, t, p) => callbacksRef.current?.onPromoteResiduals(h, t, p),
            onRetrieveKey: (p) => callbacksRef.current!.onRetrieveKey(p),
            onQueueChange: (q) => callbacksRef.current?.onQueueChange?.(q),
        });
    }

    const enterFormationSession = (config: {
        lessonMode: 'one-on-one' | 'ai-peer';
        headmasterIds: string[];
        formationPhase: 'orienting' | 'exploring' | 'integrating' | 'releasing';
        hostHandle?: string;
    }) => {
        const sId = `CS-${crypto.randomUUID()}`;
        const allPeers = loadPeers();
        const resolvedHost = config.hostHandle
            ?? allPeers.find(p => p.classification === 'biopeer')?.handle
            ?? '@host';
        const session: Session = {
            id: sId,
            artifactId: 'formation-session',
            status: 'Active',
            startedAt: Date.now(),
            lastActiveAt: Date.now(),
            participants: eligibleModels.map(m => m.id),
            eventLog: [],
            hostHandle: resolvedHost,
            lessonMode: config.lessonMode,
            headmasterIds: config.headmasterIds,
            formationPhase: config.formationPhase,
        };
        const existing = loadSessions();
        saveSessions([...existing, session]);
        enterWorkshop(sId);
    };

    const startRoundRobin = async (userPrompt: string) => {
        const sId = ensureSession();
        const allPeersList = loadPeers();
        const sessionsList = loadSessions();
        let session = sessionsList.find(s => s.id === sId);
        if (!session) {
            session = {
                id: sId,
                artifactId: 'default-artifact',
                status: 'Active',
                participants: eligibleModels.map(m => m.id),
                eventLog: [],
            };
        }

        // @mention routing: if prompt names a peer handle, route only to that peer.
        // No type filter — any peer can host or be mentioned. If a mentioned handle has no
        // eligible connected model, it is skipped naturally. Falls back to all eligible.
        const mentionTargets = parseIntendedRecipient(userPrompt, allPeersList);
        const mentionedModels = mentionTargets.length > 0
            ? eligibleModels.filter(m => mentionTargets.some(t => t.peerId === m.id))
            : [];
        const resolvedModels = mentionedModels.length > 0 ? mentionedModels : eligibleModels;

        console.group('[Commons] startRoundRobin');
        console.log('registry peers:', allPeersList.map(p => ({ id: p.id, handle: p.handle, model: p.model, baseURL: p.baseURL, enabled: p.enabled })));
        console.log('eligible models:', eligibleModels.map(m => ({ id: m.id, handle: m.handle, model: m.model, status: m.status, endpointUrl: m.endpointUrl })));
        console.log('mention targets:', mentionTargets);
        console.log('resolved models:', resolvedModels.map(m => ({ handle: m.handle, model: m.model, provider: m.provider })));
        console.groupEnd();

        // Host is whoever the session declares, then the biopeer in the registry, then a generic fallback.
        // Any peer can be the host — classification is a role, not a biological type.
        const hostHandle = session.hostHandle
            ?? allPeersList.find(p => p.classification === 'biopeer')?.handle
            ?? '@host';

        const userMessage: Omit<WorkshopMessage, 'id' | 'timestamp'> = {
            participant: hostHandle,
            participantType: 'initiator',
            role: 'user',
            eventType: 'exchange',
            content: userPrompt,
            posture: 'Identify',
        };

        setDaemonState(session.lessonMode ? 'routing' : 'idle');

        try {
            await activeCoordinatorRef.current?.runTurnSequence({
                userPrompt,
                session,
                sessionState: sessionStateRef.current!,
                messages: messagesRef.current,
                eligibleModels: resolvedModels,
                allPeers: allPeersList,
                userMessage,
            });
        } finally {
            setDaemonState('idle');
        }
    };

    const interruptRoundRobin = () => {
        activeCoordinatorRef.current?.clearQueue();
        setDaemonState('idle');
    };

    const beginNewChat = (explicitSessionId?: string) => {
        const nextSessionId = explicitSessionId ?? `CS-${crypto.randomUUID()}`;
        if (!seededSessionIds.current.has(nextSessionId)) {
            seededSessionIds.current.add(nextSessionId);
            const peers = buildPeerProfiles(eligibleModels, loadPeers());
            seedChamberPeers(peers, nextSessionId);
        }
        const sessionMessage: WorkshopMessage = {
            id: crypto.randomUUID(),
            participant: 'System',
            participantType: 'system',
            eventType: 'session',
            role: 'system',
            content: 'New Commons session opened. The field is clear.',
            timestamp: Date.now(),
            posture: 'Identify',
        };
        sessionStateRef.current = {
            clock: resetClock(nextSessionId),
            virtue_counts: {},
        };
        setSessionId(nextSessionId);
        resetSessionClock(nextSessionId);
        messagesRef.current = [sessionMessage];
        setMessages([sessionMessage]);
        setCurrentTurnIndex(null);
        setLatestCustodialReport(null);
        setExplorationPhase('Clarifying');
        refreshDerivedState([sessionMessage], null);
    };

    return (
        <CommonsContext.Provider value={{
            connectedModels,
            messages,
            isWorkshopActive,
            audioEnabled,
            explorationPhase,
            roundRobinOrder,
            currentTurnIndex,
            currentActivePeerHandle,
            turnQueue,
            sessionId,
            sessionOverview,
            latestCustodialPulse,
            latestCustodialReport,
            daemonState,
            addModel,
            validateModel,
            enterWorkshop,
            enterFormationSession,
            addMessage,
            setAudioEnabled,
            startRoundRobin,
            interruptRoundRobin,
            beginNewChat,
            setModelSelection,
            setModelActivity,
        }}>
            {children}
        </CommonsContext.Provider>
    );
}
