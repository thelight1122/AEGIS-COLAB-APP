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
import { getAdapter } from '../core/llm/adapters';
import { useDataQuad } from './useDataQuad';
import { useKeyring } from './KeyringContext';
import {
    analyzeOrientationResponse,
    analyzeResponseDiscipline,
    buildCustodialPulse,
    buildPeerProfiles,
    buildPeerPrompt,
    collectResidualPatterns,
    computeExplorationPhase,
    derivePosture,
    extractPeerIntrospection,
    inferAffectHint,
    summarizeAdvocate,
    summarizeCommonsSession,
} from '../core/commons/session';
import { runPipeline, type SessionState } from '../../server/steward-core';
import { getEntry as getBookcaseEntry } from '../../server/bookcase.js';
import { resetClock } from '../core/governance/integrityClock';
import { HUMAN_PEER } from '../core/peers/humanPeer';
import { createVerifiedOrientation, markOrientationStale } from '../core/peers/orientation';
import { loadPeers, savePeers, updatePeerOrientation } from '../core/peers/peerRegistryStore';
import { loadActiveTeam } from '../core/peers/activeTeamStore';
import { readPeerContext, type PeerContextRead } from '../services/dataquad';

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
    const [messages, setMessages] = useState<WorkshopMessage[]>([]);
    const [isWorkshopActive, setIsWorkshopActive] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [explorationPhase, setExplorationPhase] = useState<ExplorationPhase>('Clarifying');
    const [roundRobinOrder, setRoundRobinOrder] = useState<string[]>([]);
    const [currentTurnIndex, setCurrentTurnIndex] = useState<number | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [latestCustodialPulse, setLatestCustodialPulse] = useState<CustodialPulse | null>(null);
    const [latestCustodialReport, setLatestCustodialReport] = useState<ReturnType<typeof runPipeline> | null>(null);
    const [sessionOverview, setSessionOverview] = useState<CommonsSessionOverview>(EMPTY_OVERVIEW);

    const sessionStateRef = useRef<SessionState | null>(null);
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
        () => connectedModels.filter(model => model.status === 'Connected' && model.isSelected && model.isActive),
        [connectedModels],
    );

    useEffect(() => {
        const restoreId = window.setTimeout(() => {
            setConnectedModels(prev => {
                const peers = loadPeers().filter(peer => peer.type === 'ai' && peer.enabled);
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
    }, [keys, keyringStatus]);

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
        await new Promise(resolve => setTimeout(resolve, 800));
        setConnectedModels(prev => prev.map(model => model.id === id ? { ...model, status: 'Connected' } : model));
        return true;
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
            const peers = buildPeerProfiles(eligibleModels);
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
        const allHandles = [HUMAN_PEER.handle, ...models.map(model => `@${model.model.toLowerCase().replace(/[^a-z0-9]+/g, '-') || model.provider}`)];
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
        const peers = loadPeers();
        return peers.find(peer =>
            peer.id === model.id ||
            (peer.provider === model.provider && peer.model === model.model) ||
            peer.provider === model.provider,
        );
    };

    const performOrientationPreflight = async (model: ConnectedModel, currentSessionId: string): Promise<PeerContextRead | undefined> => {
        if (!(model.provider === 'lmstudio' || model.provider === 'ollama')) return undefined;

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
                const targetPeer = peers.find(peer => peer.id === model.id || peer.provider === model.provider);
                if (!targetPeer) return peers;
                return updatePeerOrientation(peers, targetPeer.id, createVerifiedOrientation({
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
                const targetPeer = peers.find(peer => peer.id === model.id || peer.provider === model.provider);
                if (!targetPeer) return peers;
                return updatePeerOrientation(peers, targetPeer.id, markOrientationStale(
                    targetPeer.orientation,
                    'Peer made self-orientation claims without a current READ_RECEIPT. Treat identity statements as unverified until a fresh context read occurs.',
                ));
            });
            return {
                displayContent: analysis.cleanedContent || responseText.trim(),
                orientationStatus: 'stale' as const,
                orientationNotes: 'Self-state was described without a verified context read.',
            };
        }

        return {
            displayContent: analysis.cleanedContent || responseText.trim(),
        };
    };

    const startRoundRobin = async (userPrompt: string) => {
        interruptRoundRobin();

        const currentSessionId = ensureSession();
        const state = sessionStateRef.current ?? {
            clock: resetClock(currentSessionId),
            virtue_counts: {},
        };
        sessionStateRef.current = state;

        const eligibleAtTurnStart = connectedModels.filter(model =>
            model.status === 'Connected' &&
            model.isSelected &&
            model.isActive,
        );
        const order = eligibleAtTurnStart.map(model => model.id);
        setRoundRobinOrder(order);

        const userAffectHint = inferAffectHint(userPrompt);
        const userReport = runPipeline({
            type: 'EXCHANGE',
            session_id: currentSessionId,
            role: 'user',
            content: userPrompt,
            ...(userAffectHint ? { affect_hint: userAffectHint } : {}),
        }, state);
        // Persist PEER entry and any SPINE promotion from user turn
        persistPeerEntry(currentSessionId, userReport.peer_entry);
        if (userReport.promoter_result.spine_entry) {
            persistSpineEntry(userReport.promoter_result.spine_entry);
        }
        if (userReport.bookcase_entry_id) {
            const heldEntry = getBookcaseEntry(userReport.bookcase_entry_id);
            if (heldEntry) persistBookcaseEntry(heldEntry);
        }
        const userPulse = buildCustodialPulse(userReport);
        const userMessage: Omit<WorkshopMessage, 'id' | 'timestamp'> = {
            participant: 'You',
            participantType: 'human',
            eventType: 'exchange',
            role: 'user',
            content: userPrompt,
            posture: derivePosture('user', userReport),
            report: userReport,
            custodialPulse: userPulse,
        };
        appendMessage(userMessage);
        recordCommonsExchange(HUMAN_PEER.handle, userPrompt, currentSessionId, eligibleAtTurnStart, userAffectHint);
        updatePeerPCT(
            HUMAN_PEER.handle,
            currentSessionId,
            [
                'Observer focus is active in Commons.',
                `Prompt: ${userPrompt}`,
                `Phase: ${computeExplorationPhase(messagesRef.current)}`,
            ].join('\n'),
        );

        for (let index = 0; index < order.length; index++) {
            setCurrentTurnIndex(index);
            const modelId = order[index];
            const model = eligibleAtTurnStart.find(candidate => candidate.id === modelId);
            if (!model) continue;

            playAudioCue();

            let responseText = '';
            const peer = resolveRegistryPeer(model);
            const peerHandle = peer?.handle ?? `@${model.model.toLowerCase().replace(/[^a-z0-9]+/g, '-') || model.provider}`;
            try {
                const adapter = getAdapter(model.provider);
                const orientationPreflight = await performOrientationPreflight(model, currentSessionId);
                updatePeerPCT(
                    peerHandle,
                    currentSessionId,
                    [
                        'Commons turn is active.',
                        `Observer prompt: ${userPrompt}`,
                        orientationPreflight
                            ? `Verified context receipt: ${orientationPreflight.receipt}`
                            : 'Verified context receipt: unavailable',
                        `Field phase: ${computeExplorationPhase(messagesRef.current)}`,
                    ].join('\n'),
                );
                const prompt = buildPeerPrompt({
                    model,
                    messages: messagesRef.current,
                    sessionId: currentSessionId,
                    sessionState: state,
                    participantCount: eligibleAtTurnStart.length + 1,
                    orientationPreflight,
                });

                const response = await adapter.completeChat({
                    provider: model.provider,
                    model: model.model,
                    apiKey: model.apiKey || keys[model.provider],
                    baseURL: model.endpointUrl,
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: userPrompt },
                    ],
                });
                responseText = response.text;
            } catch (error) {
                console.error(`Model ${model.model} failed:`, error);
                responseText = `[Error] ${error instanceof Error ? error.message : 'No response from provider'}`;
            }

            const orientationEvidence = applyOrientationEvidence(model, currentSessionId, responseText);
            const introspection = extractPeerIntrospection(orientationEvidence.displayContent);
            const displayResponseText = introspection.displayContent || orientationEvidence.displayContent;
            const discipline = analyzeResponseDiscipline(displayResponseText, userPrompt);

            const aiAffectHint = inferAffectHint(displayResponseText);
            const aiReport = runPipeline({
                type: 'EXCHANGE',
                session_id: currentSessionId,
                role: 'ai',
                content: displayResponseText,
                ...(aiAffectHint ? { affect_hint: aiAffectHint } : {}),
            }, state);
            // Persist PEER entry and any SPINE promotion from AI turn
            persistPeerEntry(currentSessionId, aiReport.peer_entry);
            if (aiReport.promoter_result.spine_entry) {
                persistSpineEntry(aiReport.promoter_result.spine_entry);
            }
            if (aiReport.bookcase_entry_id) {
                const heldEntry = getBookcaseEntry(aiReport.bookcase_entry_id);
                if (heldEntry) persistBookcaseEntry(heldEntry);
            }
            const aiPulse = buildCustodialPulse(aiReport);
            const residualPatterns = collectResidualPatterns({
                orientationStatus: orientationEvidence.orientationStatus,
                discipline,
                report: aiReport,
            });
            appendMessage({
                participant: model.model,
                participantType: 'ai',
                eventType: 'exchange',
                role: 'assistant',
                content: displayResponseText,
                posture: derivePosture('ai', aiReport),
                report: aiReport,
                custodialPulse: aiPulse,
                orientationStatus: orientationEvidence.orientationStatus,
                orientationReceipt: orientationEvidence.orientationReceipt,
                orientationNotes: orientationEvidence.orientationNotes,
                fidelityState: discipline.fidelityState,
                fidelityNotes: discipline.fidelityNotes,
                canonCitationNotes: discipline.canonCitationNotes,
                inquiryDisposition: discipline.inquiryDisposition,
                inquiryNotes: discipline.inquiryNotes,
                peerIntrospection: introspection.introspection,
                peerIntrospectionNotes: introspection.introspectionNotes,
            });
            recordCommonsExchange(peerHandle, displayResponseText, currentSessionId, eligibleAtTurnStart, aiAffectHint);
            updatePeerPCT(
                peerHandle,
                currentSessionId,
                [
                    'Latest Commons contribution recorded.',
                    `Observer prompt: ${userPrompt}`,
                    `Orientation: ${orientationEvidence.orientationStatus ?? 'unverified'}`,
                    orientationEvidence.orientationReceipt
                        ? `READ_RECEIPT: ${orientationEvidence.orientationReceipt}`
                        : 'READ_RECEIPT: unavailable',
                    `Current contribution: ${displayResponseText}`,
                ].join('\n'),
            );
            promoteResidualPatterns({
                peerHandle,
                currentSessionId,
                sourceTurnId: modelId,
                patterns: residualPatterns,
            });

            if (aiPulse.verdict !== 'RELEASE' || aiPulse.findingCount > 0 || !aiReport.advocate_result.affective_congruent) {
                appendMessage({
                    participant: 'Commons Custodian',
                    participantType: 'custodian',
                    eventType: 'reflection',
                    role: 'system',
                    content: [
                        `ATE ${aiReport.ate_result.verdict}: ${aiReport.ate_result.reason}`,
                        `Conscience: ${aiReport.conscience.map(output => output.post).join(' ') || 'No additional conscience sequence.'}`,
                        `Advocate: ${summarizeAdvocate(aiReport.advocate_result)}`,
                    ].join('\n\n'),
                    posture: derivePosture('ai', aiReport),
                    sourceTurnId: modelId,
                });
            }

            if (discipline.hasSourceFidelityIssue || discipline.hasCanonCitationIssue || discipline.hasInquiryIssue) {
                const reflectionParts = [
                    discipline.hasSourceFidelityIssue
                        ? `Source fidelity: ${discipline.fidelityNotes}`
                        : undefined,
                    discipline.hasCanonCitationIssue
                        ? `Canon citation: ${discipline.canonCitationNotes}`
                        : undefined,
                    discipline.hasInquiryIssue
                        ? `Inquiry posture: ${discipline.inquiryNotes}`
                        : undefined,
                ].filter(Boolean);

                appendMessage({
                    participant: 'Commons Custodian',
                    participantType: 'custodian',
                    eventType: 'reflection',
                    role: 'system',
                    content: reflectionParts.join('\n\n'),
                    posture: 'Identify',
                    sourceTurnId: modelId,
                    fidelityState: discipline.fidelityState,
                    fidelityNotes: discipline.fidelityNotes,
                    canonCitationNotes: discipline.canonCitationNotes,
                    inquiryDisposition: discipline.inquiryDisposition,
                    inquiryNotes: discipline.inquiryNotes,
                });
            }

            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setCurrentTurnIndex(null);
    };

    const interruptRoundRobin = () => {
        setCurrentTurnIndex(null);
    };

    const beginNewChat = () => {
        const nextSessionId = `CS-${crypto.randomUUID()}`;
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
        setLatestCustodialPulse(null);
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
            sessionId,
            sessionOverview,
            latestCustodialPulse,
            latestCustodialReport,
            addModel,
            validateModel,
            enterWorkshop,
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
