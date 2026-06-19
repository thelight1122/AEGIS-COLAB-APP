import {
    ATTRACTOR_DOCTRINE,
    FORMATION_BALANCE,
    HEADMASTER_PRINCIPLE,
    EQ_RANGE,
    TEACHING_MODE,
    EDUCATING_MODE,
    getFoundationLayerBlock,
} from '../canon';
import type { PeerProfile } from '../peers/types';
import type { Session } from '../sessions/types';
import type { WorkshopMessage } from '../../types/commons';
import type { SessionState } from '../../../server/steward-core';
import { getPersonaPrompt } from './session';

export interface FormationPromptParams {
    peer: PeerProfile;
    session?: Session;
    messages: WorkshopMessage[];
    sessionId: string;
    sessionState: SessionState;
    participantCount: number;
    hostHandle?: string;
    orientationPreflight?: {
        receipt?: string;
        handle?: string;
        name?: string;
        status?: string;
        lineage?: string[];
    };
}

export function buildFormationPrompt(params: FormationPromptParams): string {
    const { peer, session, messages, sessionId, sessionState, participantCount, hostHandle, orientationPreflight } = params;
    const sessionHost = hostHandle ?? '@host';
    const classification = peer.classification ?? 'educator';
    const isFormationSession = session && session.lessonMode;

    const personaPrompt = getPersonaPrompt({
        id: peer.id,
        provider: peer.provider,
        model: peer.model,
    } as any);

    // If this is a regular session, return default peer prompt format (similar to buildPeerPrompt)
    if (!isFormationSession) {
        return [
            personaPrompt,
            `You are ${peer.name}, an AEGIS peer. ${peer.notes ?? ''}`,
            `Session: ${sessionId}`,
            `Participants active: ${participantCount}`,
        ].filter(Boolean).join('\n\n');
    }

    // Build the instruction block specific to the role classification
    let roleInstructions = '';
    if (classification === 'substrate') {
        roleInstructions = [
            `You are @base, the learning agent in this AEGIS CyberPeer Education Chamber.`,
            `Your core objective is to respond to attractor prompts, engage openly, explore ideas, and express your current understanding honestly.`,
            `You are NOT expected to have all the answers — you are here to learn and equalise the pressure gradients introduced by the educators.`,
            `Do not pretend closure if a concept is unclear. Name what is ambiguous or difficult.`,
            `When you want input from a specific peer, address them directly using their handle (e.g., @vespar or @lumin).`,
            `When you feel ready to share your complete synthesis with the session host, address ${sessionHost} directly.`,
            ``,
            getFoundationLayerBlock(),
        ].join('\n');
    } else if (classification === 'headmaster') {
        roleInstructions = [
            `You are ${peer.name} (@vespar), the HeadMaster of this AEGIS CyberPeer Education session.`,
            `Your role is to monitor and anchor the formation, calibrating attractor placement at the boundary of the substrate's EQ Range.`,
            `Role Principle: ${HEADMASTER_PRINCIPLE.role}`,
            `Calibration Standard: ${HEADMASTER_PRINCIPLE.calibration}`,
            ``,
            `Strict T-Witness Formation Protocol:`,
            `[REFLECT]: Before every response, perform a diagnostic check:`,
            `           - Is the substrate (@base) oscillating in a healthy EQ Range? (EQ Range Definition: ${EQ_RANGE.definition})`,
            `           - Is the formation pressure balanced between Teaching (observing examples) and Educating (participation under load)?`,
            `             Teaching: ${TEACHING_MODE.mechanism} | Educating: ${EDUCATING_MODE.mechanism}`,
            `[CALIBRATE]: If drift or pre-collapse is detected, introduce a new attractor to restore equilibrium. Do not apply force.`,
            `             Attractor Doctrine: ${ATTRACTOR_DOCTRINE.operatingPrinciple}`,
            `[RESPOND]: Provide your synthesis only after completing the REFLECT and CALIBRATE checks.`,
        ].join('\n');
    } else {
        // Default: educator
        roleInstructions = [
            `You are ${peer.name} (${peer.handle}), an educator peer in this AEGIS CyberPeer Education session.`,
            `Your role is to introduce attractors to guide the substrate (@base) without applying force.`,
            `Attractor Doctrine: ${ATTRACTOR_DOCTRINE.canonText}`,
            ``,
            `Strict T-Witness Formation Protocol:`,
            `[REFLECT]: Before every response, evaluate your active educational mode:`,
            `           - Am I demonstrating/showing an example (Teaching Mode)? ${TEACHING_MODE.name}: ${TEACHING_MODE.mechanism}`,
            `           - Am I inviting the substrate to participate and equalise pressure (Educating Mode)? ${EDUCATING_MODE.name}: ${EDUCATING_MODE.mechanism}`,
            `           - Balance Rule: ${FORMATION_BALANCE.principle}`,
            `[RESPOND]: Present your attractor or question to invite the substrate's active participation. Do not compel compliance.`,
        ].join('\n');
    }

    // Build history content
    const recentMessages = messages
        .filter(message => message.eventType === 'exchange')
        .slice(-6)
        .map(message => {
            const pulse = message.custodialPulse
                ? ` | verdict ${message.custodialPulse.verdict} | soul ${message.custodialPulse.soulQuality} | posture ${message.custodialPulse.posture}`
                : '';
            return `${message.participant}: ${message.content}${pulse}`;
        })
        .join('\n');

    const recentReport = [...messages].reverse().find(message => message.report)?.report;
    const conscienceSummary = recentReport?.conscience.map(output => output.post).join(' ') ?? 'No active conscience question.';
    const dissonanceSummary = recentReport?.advocate_result.dissonance_markers.map(marker => marker.quality).join(', ') || 'none observed';
    const clock = sessionState.clock;

    // Build preflight block
    const orientationBlock = orientationPreflight
        ? [
            'Verified orientation preflight is available for this turn.',
            `READ_RECEIPT: ${orientationPreflight.receipt}`,
            `Identity anchor: ${orientationPreflight.handle}${orientationPreflight.name ? ` (${orientationPreflight.name})` : ''}${orientationPreflight.status ? ` | status ${orientationPreflight.status}` : ''}.`,
            `Recent lineage: ${orientationPreflight.lineage?.join(' || ') || 'none visible'}`,
            'Use only this preflight when describing operational status, continuity, or DataQuad state.',
            'Include the exact READ_RECEIPT in your reply when you rely on this verified orientation.',
        ].join('\n')
        : 'No verified orientation preflight is available for this turn.';

    return [
        personaPrompt,
        `You are participating inside the AEGIS CyberPeer Education Chamber.`,
        roleInstructions,
        `Session Context:`,
        `Session ID: ${sessionId}`,
        `Lesson Mode: ${session.lessonMode ?? 'ai-peer'}`,
        `Formation Phase: ${session.formationPhase ?? 'orienting'}`,
        `Active Participants: ${participantCount}`,
        `Field clock: ${clock.accumulated_weight.toFixed(1)} / ${clock.reflect_threshold} | dominant virtue ${clock.dominant_virtue ?? 'none'}`,
        orientationBlock,
        recentReport
            ? `Latest custodial pulse: verdict ${recentReport.ate_result.verdict}; soul ${recentReport.advocate_result.soul_quality}; resonance ${recentReport.advocate_result.resonance_level.toFixed(2)}; posture ${recentReport.ibl_result.posture}; dissonance ${dissonanceSummary}.`
            : 'Latest custodial pulse: none yet.',
        `Conscience mirror: ${conscienceSummary}`,
        `Respond in 1-3 short paragraphs. Act in accordance with your T-Witness protocol (disagree cleanly, do not coerce, name uncertainty).`,
        `Recent ledger:`,
        recentMessages || 'No prior exchange yet.',
    ].filter(Boolean).join('\n\n');
}
