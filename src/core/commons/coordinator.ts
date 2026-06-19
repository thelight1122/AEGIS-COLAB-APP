import type { ConnectedModel, WorkshopMessage } from '../../types/commons';
import type { PeerProfile } from '../peers/types';
import type { Session } from '../sessions/types';
import type { SessionState, StewardReport } from '../../../server/steward-core';
import { parseIntendedRecipient, type TurnTarget } from './routingDaemon';
import { buildFormationPrompt } from './buildFormationPrompt';
import { callGateway } from '../llm/gatewayClient';

export interface CoordinatorCallbacks {
    onActivePeer: (handle: string | null) => void;
    onMessage: (message: Omit<WorkshopMessage, 'id' | 'timestamp'>) => void;
    onPreflight: (model: ConnectedModel) => Promise<any>;
    onApplyEvidence: (model: ConnectedModel, text: string) => any;
    onRunPipeline: (content: string, role: 'user' | 'ai', affectHint?: any) => Promise<StewardReport>;
    onPersistEntries: (report: StewardReport, handle: string) => void;
    onRecordExchange: (handle: string, content: string, affectHint?: any) => void;
    onUpdateWorkingMemory: (handle: string, content: string) => void;
    onPromoteResiduals: (handle: string, turnId: string, patterns: any[]) => void;
    onRetrieveKey: (provider: string) => string | null;
    onQueueChange?: (queue: TurnTarget[]) => void;
}

export class TurnCoordinator {
    private turnQueue: TurnTarget[] = [];
    private isExecuting = false;

    constructor(private callbacks: CoordinatorCallbacks) {}

    public getQueue(): TurnTarget[] {
        return [...this.turnQueue];
    }

    public clearQueue() {
        this.turnQueue = [];
        this.isExecuting = false;
        this.callbacks.onActivePeer(null);
        this.callbacks.onQueueChange?.([]);
    }

    /**
     * Executes the turn sequence based on the session's configuration.
     * Can run in legacy round-robin mode or targeted mention mode.
     */
    public async runTurnSequence(params: {
        userPrompt: string;
        session: Session;
        sessionState: SessionState;
        messages: WorkshopMessage[];
        eligibleModels: ConnectedModel[];
        allPeers: PeerProfile[];
        userMessage: Omit<WorkshopMessage, 'id' | 'timestamp'>;
    }): Promise<void> {
        if (this.isExecuting) return;
        this.isExecuting = true;

        const { userPrompt, session, sessionState, messages, eligibleModels, allPeers, userMessage } = params;
        const isFormationMode = !!session.lessonMode;

        // 1. Process user message first
        const userReport = await this.callbacks.onRunPipeline(userPrompt, 'user', userMessage.report?.findings?.[0]?.virtue);
        this.callbacks.onPersistEntries(userReport, userMessage.participant);
        this.callbacks.onMessage({ ...userMessage, report: userReport });

        const currentSessionId = session.id;

        // 2. Determine initial targets
        if (isFormationMode) {
            this.turnQueue = parseIntendedRecipient(userPrompt, allPeers);
            this.callbacks.onQueueChange?.([...this.turnQueue]);

            // Fallback: route to substrate if no mention is found
            if (this.turnQueue.length === 0) {
                const substrate = allPeers.find(p => p.classification === 'substrate');
                if (substrate) {
                    this.turnQueue.push({
                        peerId: substrate.id,
                        handle: substrate.handle,
                        type: substrate.type,
                        classification: substrate.classification,
                    });
                    this.callbacks.onQueueChange?.([...this.turnQueue]);
                }
            }

            // 3. targeted queue loop
            while (this.turnQueue.length > 0) {
                const target = this.turnQueue.shift()!;
                this.callbacks.onQueueChange?.([...this.turnQueue]);

                if (target.type === 'human') {
                    // Hand control back to the human biopeer
                    this.callbacks.onActivePeer(null);
                    break;
                }

                const model = eligibleModels.find(m => m.id === target.peerId);
                if (!model) continue;

                this.callbacks.onActivePeer(target.handle);

                // Run preflight context read
                const orientationPreflight = await this.callbacks.onPreflight(model);
                
                this.callbacks.onUpdateWorkingMemory(
                    target.handle,
                    [
                        'Commons turn is active.',
                        `Observer prompt: ${userPrompt}`,
                        orientationPreflight
                            ? `Verified context receipt: ${orientationPreflight.receipt}`
                            : 'Verified context receipt: unavailable',
                        `Field phase: ${session.formationPhase ?? 'exploring'}`,
                    ].join('\n')
                );

                const prompt = buildFormationPrompt({
                    peer: target as any,
                    session,
                    messages,
                    sessionId: currentSessionId,
                    sessionState,
                    participantCount: eligibleModels.length + 1,
                    hostHandle: userMessage.participant,
                    orientationPreflight,
                });

                // Append peer-specific system prompt and knowledge files after the
                // formation prompt so AEGIS principles always come first.
                const systemParts: string[] = [prompt];
                if (model.systemPrompt?.trim()) {
                    systemParts.push('\n---\n' + model.systemPrompt.trim());
                }
                if (model.contextFiles?.length) {
                    for (const file of model.contextFiles) {
                        if (file.content?.trim()) {
                            systemParts.push(`\n---\n## ${file.name}\n${file.content.trim()}`);
                        }
                    }
                }
                const fullSystemPrompt = systemParts.join('');

                let responseText = '';
                try {
                    const apiKey = this.callbacks.onRetrieveKey(model.provider) || model.apiKey;
                    const response = await callGateway({
                        provider: model.provider,
                        model: model.model,
                        apiKey: apiKey ?? undefined,
                        baseURL: model.endpointUrl,
                        messages: [
                            { role: 'system', content: fullSystemPrompt },
                            { role: 'user', content: userPrompt },
                        ],
                    });
                    responseText = response.text;
                } catch (error) {
                    console.error(`[Coordinator] Model ${model.model} failed:`, error);
                    responseText = `[Error] ${error instanceof Error ? error.message : 'No response from provider'}`;
                }

                const orientationEvidence = this.callbacks.onApplyEvidence(model, responseText);
                const displayContent = orientationEvidence.displayContent || responseText;

                // Process output pipeline
                const aiReport = await this.callbacks.onRunPipeline(displayContent, 'ai');
                this.callbacks.onPersistEntries(aiReport, target.handle);

                // Trigger callback to record message
                this.callbacks.onMessage({
                    participant: model.model,
                    participantType: 'ai',
                    eventType: 'exchange',
                    role: 'assistant',
                    content: displayContent,
                    posture: aiReport.ibl_result.posture as any,
                    report: aiReport,
                    custodialPulse: {
                        verdict: aiReport.ate_result.verdict,
                        posture: aiReport.ibl_result.posture as any,
                        soulQuality: aiReport.advocate_result.soul_quality,
                        resonanceLevel: aiReport.advocate_result.resonance_level,
                        dominantAxis: aiReport.advocate_result.dominant_axis,
                        findingCount: aiReport.findings.filter(f => f.kind !== 'CANON_CLEAN').length,
                        canonClean: aiReport.findings.filter(f => f.kind !== 'CANON_CLEAN').length === 0,
                    },
                    orientationStatus: orientationEvidence.orientationStatus,
                    orientationReceipt: orientationEvidence.orientationReceipt,
                    orientationNotes: orientationEvidence.orientationNotes,
                });

                this.callbacks.onRecordExchange(target.handle, displayContent);

                // HeadMaster calibration triggers after Substrate response — all HeadMasters in order
                if (target.classification === 'substrate' && session.headmasterIds?.length) {
                    const hmTargets = session.headmasterIds
                        .map(hmId => allPeers.find(p => p.id === hmId))
                        .filter((p): p is NonNullable<typeof p> => Boolean(p))
                        .map(hmPeer => ({
                            peerId: hmPeer.id,
                            handle: hmPeer.handle,
                            type: 'ai' as const,
                            classification: hmPeer.classification,
                        }));
                    if (hmTargets.length > 0) {
                        this.turnQueue.unshift(...hmTargets);
                        this.callbacks.onQueueChange?.([...this.turnQueue]);
                    }
                }

                // Parse mentions in the response
                const newMentions = parseIntendedRecipient(displayContent, allPeers);
                if (newMentions.length > 0) {
                    this.turnQueue.push(...newMentions);
                    this.callbacks.onQueueChange?.([...this.turnQueue]);
                }

                // Check if human is in queue; if so, yield
                if (this.turnQueue.some(t => t.type === 'human')) {
                    this.callbacks.onActivePeer(null);
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } else {
            // Legacy Round-Robin execution for non-formation mode
            for (let index = 0; index < eligibleModels.length; index++) {
                const model = eligibleModels[index];
                this.callbacks.onActivePeer(model.handle ?? model.model);

                // standard sequential execution
                const orientationPreflight = await this.callbacks.onPreflight(model);
                const prompt = buildFormationPrompt({
                    peer: model as any,
                    session,
                    messages,
                    sessionId: currentSessionId,
                    sessionState,
                    participantCount: eligibleModels.length + 1,
                    hostHandle: userMessage.participant,
                    orientationPreflight,
                });

                const systemParts2: string[] = [prompt];
                if (model.systemPrompt?.trim()) {
                    systemParts2.push('\n---\n' + model.systemPrompt.trim());
                }
                if (model.contextFiles?.length) {
                    for (const file of model.contextFiles) {
                        if (file.content?.trim()) {
                            systemParts2.push(`\n---\n## ${file.name}\n${file.content.trim()}`);
                        }
                    }
                }
                const fullSystemPrompt2 = systemParts2.join('');

                let responseText = '';
                try {
                    const apiKey = this.callbacks.onRetrieveKey(model.provider) || model.apiKey;
                    const response = await callGateway({
                        provider: model.provider,
                        model: model.model,
                        apiKey: apiKey ?? undefined,
                        baseURL: model.endpointUrl,
                        messages: [
                            { role: 'system', content: fullSystemPrompt2 },
                            { role: 'user', content: userPrompt },
                        ],
                    });
                    responseText = response.text;
                } catch (error) {
                    responseText = `[Error] ${error instanceof Error ? error.message : 'No response from provider'}`;
                }

                const orientationEvidence = this.callbacks.onApplyEvidence(model, responseText);
                const displayContent = orientationEvidence.displayContent || responseText;

                const aiReport = await this.callbacks.onRunPipeline(displayContent, 'ai');
                this.callbacks.onPersistEntries(aiReport, model.handle ?? model.model);

                this.callbacks.onMessage({
                    participant: model.model,
                    participantType: 'ai',
                    eventType: 'exchange',
                    role: 'assistant',
                    content: displayContent,
                    posture: aiReport.ibl_result.posture as any,
                    report: aiReport,
                    custodialPulse: {
                        verdict: aiReport.ate_result.verdict,
                        posture: aiReport.ibl_result.posture as any,
                        soulQuality: aiReport.advocate_result.soul_quality,
                        resonanceLevel: aiReport.advocate_result.resonance_level,
                        dominantAxis: aiReport.advocate_result.dominant_axis,
                        findingCount: aiReport.findings.filter(f => f.kind !== 'CANON_CLEAN').length,
                        canonClean: aiReport.findings.filter(f => f.kind !== 'CANON_CLEAN').length === 0,
                    },
                    orientationStatus: orientationEvidence.orientationStatus,
                    orientationReceipt: orientationEvidence.orientationReceipt,
                    orientationNotes: orientationEvidence.orientationNotes,
                });

                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        this.isExecuting = false;
        this.callbacks.onActivePeer(null);
    }
}
