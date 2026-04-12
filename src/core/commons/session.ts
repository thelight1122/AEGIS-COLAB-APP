import type {
    ConnectedModel,
    CommonsSessionOverview,
    CustodialPulse,
    ExplorationPhase,
    InquiryDisposition,
    SourceFidelityState,
    WorkshopMessage,
    WorkshopPosture,
} from '../../types/commons';
import type { PeerProfile } from '../peers/types';
import type { PeerContextRead } from '../../services/dataquad';
import { HUMAN_PEER } from '../peers/humanPeer';
import { PERSONA_TEMPLATES } from '../peers/personaStore';
import type { AdvocateResult, ExchangeRole, SessionState, StewardReport } from '../../../server/steward-core';
import { createUnverifiedOrientation } from '../peers/orientation';

export interface CommonsAffectHint {
    label: string;
    intensity: number;
    direction: number;
    trigger: string;
}

const POSITIVE_PATTERNS = /\b(resonate|aligned|clarity|clear|care|trust|warm|cohere|expand|open|build|steady|gentle)\b/i;
const NEGATIVE_PATTERNS = /\b(break|fracture|urgent|stuck|blocked|collapse|wrong|conflict|pressure|harm|risk|fear)\b/i;
const PRESSURE_PATTERNS = /\b(now|immediately|urgent|asap|must|need to|have to)\b/i;
const READ_RECEIPT_PATTERN = /^\s*READ_RECEIPT\s*:\s*(.+)$/im;
const FIDELITY_LABEL_PATTERN = /^\s*Fidelity\s*:\s*(Verbatim|Derived|Interpreted|Generated)\s*$/gim;
const SELF_ORIENTATION_PATTERNS = [
    /\boperational status\b/i,
    /\bdataquad\b/i,
    /\bstate of q[1-4]\b/i,
    /\bq[1-4]\s*\(/i,
    /\blineage\b/i,
    /\bcontinuity\b/i,
    /\bi am @/i,
    /\bi am active and oriented\b/i,
    /\bverified context read\b/i,
];
const SOURCE_CLAIM_PATTERNS = [
    /\bverbatim\b/i,
    /\bexact wording\b/i,
    /\bcopied from source\b/i,
    /\bsource[- ]extracted\b/i,
    /\bdirectly from source\b/i,
    /\bcomplete\b/i,
];
const DISCERNMENT_REQUEST_PATTERNS = [
    /\?/,
    /^\s*(what|how|why|should|could|would|can|is|are|do|does)\b/i,
    /\b(help me think|clarify|discern|reflect|understand|make sense of|what do you think)\b/i,
];
const INQUIRY_SIGNAL_PATTERNS = [
    /\?/,
    /\bwould it help\b/i,
    /\bmay be\b/i,
    /\bseems\b/i,
    /\blooks like\b/i,
    /\bcould it be\b/i,
    /\bwhat if\b/i,
    /\bone path is\b/i,
    /\banother is\b/i,
];
const CONTRIBUTION_SIGNAL_PATTERNS = [
    /\bi recommend\b/i,
    /\byou should\b/i,
    /\bwe should\b/i,
    /\bthe best approach\b/i,
    /\bthe answer is\b/i,
    /\bhere is\b/i,
    /\bdo this\b/i,
];
const CANON_AXIOM_GUARDS: Record<string, string> = {
    '1': 'Balance',
    '4': 'Flow',
    '14': 'Leadership',
};
const AXIOM_REFERENCE_PATTERN = /\bAxiom\s+(\d+)(?:\s*\(([^)]+)\))?/gi;

export interface OrientationAnalysis {
    cleanedContent: string;
    receipt?: string;
    continuityVersion?: string;
    hasSelfOrientationClaim: boolean;
}

export interface ResponseDisciplineAnalysis {
    fidelityState?: SourceFidelityState;
    fidelityNotes?: string;
    hasSourceFidelityIssue: boolean;
    canonCitationNotes?: string;
    hasCanonCitationIssue: boolean;
    inquiryDisposition: InquiryDisposition;
    inquiryNotes?: string;
    hasInquiryIssue: boolean;
}

export interface PeerIntrospectionAnalysis {
    displayContent: string;
    introspection?: string;
    introspectionNotes?: string;
}

export interface ResidualPattern {
    key: string;
    label: string;
    valence: 1 | -1;
    sourceKind: 'orientation' | 'citation' | 'affect' | 'resonance';
    summary: string;
}

export function inferAffectHint(content: string): CommonsAffectHint | undefined {
    const trimmed = content.trim();
    if (!trimmed) return undefined;

    const positive = POSITIVE_PATTERNS.test(trimmed);
    const negative = NEGATIVE_PATTERNS.test(trimmed);
    const pressured = PRESSURE_PATTERNS.test(trimmed);

    if (!positive && !negative && !pressured) return undefined;

    if (positive && !negative) {
        return {
            label: 'resonance',
            intensity: pressured ? 0.75 : 0.62,
            direction: 1.1,
            trigger: pressured ? 'energized alignment' : 'coherent expansion',
        };
    }

    return {
        label: pressured ? 'pressure' : 'fracture',
        intensity: pressured ? 0.85 : 0.68,
        direction: pressured ? -1.6 : -1.1,
        trigger: pressured ? 'urgency pressure' : 'field tension',
    };
}

export function analyzeOrientationResponse(content: string): OrientationAnalysis {
    const receiptMatch = content.match(READ_RECEIPT_PATTERN);
    const receipt = receiptMatch?.[1]?.trim();
    const cleanedContent = receiptMatch
        ? content.replace(receiptMatch[0], '').replace(/\n{3,}/g, '\n\n').trim()
        : content.trim();

    const continuityVersionMatch = receipt?.match(/\bcontinuity(?:[_ -]?version)?\s*[=:]\s*([^\s|,;]+)/i);
    const hasSelfOrientationClaim = SELF_ORIENTATION_PATTERNS.some(pattern => pattern.test(content));

    return {
        cleanedContent,
        receipt,
        continuityVersion: continuityVersionMatch?.[1],
        hasSelfOrientationClaim,
    };
}

export function analyzeResponseDiscipline(content: string, userPrompt: string): ResponseDisciplineAnalysis {
    const fidelityLabels = [...content.matchAll(FIDELITY_LABEL_PATTERN)].map(match => match[1].toLowerCase() as SourceFidelityState);
    const fidelityState = fidelityLabels.length > 1 ? 'mixed' : fidelityLabels[0];
    const hasSourceClaim = SOURCE_CLAIM_PATTERNS.some(pattern => pattern.test(content));
    const hasSourceFidelityIssue = hasSourceClaim && !fidelityState;

    let fidelityNotes: string | undefined;
    if (hasSourceFidelityIssue) {
        fidelityNotes = 'Source-sensitive claim made without a declared fidelity state.';
    } else if (fidelityState) {
        fidelityNotes = `Fidelity declared as ${fidelityState}.`;
    }

    const canonCitationIssues = [...content.matchAll(AXIOM_REFERENCE_PATTERN)]
        .map(match => {
            const axiomNumber = match[1];
            const citedTitle = match[2]?.trim();
            const expectedTitle = CANON_AXIOM_GUARDS[axiomNumber];

            if (!expectedTitle || !citedTitle) return undefined;
            if (new RegExp(`\\b${expectedTitle}\\b`, 'i').test(citedTitle)) return undefined;

            return `Axiom ${axiomNumber} was cited as "${citedTitle}", but canon names it "${expectedTitle}". Treat this as interpreted alignment, not verified citation.`;
        })
        .filter((value): value is string => Boolean(value));
    const canonCitationNotes = canonCitationIssues.join(' ');
    const hasCanonCitationIssue = canonCitationIssues.length > 0;

    const discernmentRequested = DISCERNMENT_REQUEST_PATTERNS.some(pattern => pattern.test(userPrompt));
    const hasInquirySignal = INQUIRY_SIGNAL_PATTERNS.some(pattern => pattern.test(content));
    const hasContributionSignal = CONTRIBUTION_SIGNAL_PATTERNS.some(pattern => pattern.test(content));
    const inquiryDisposition: InquiryDisposition = hasInquirySignal && hasContributionSignal
        ? 'mixed'
        : hasInquirySignal
            ? 'inquiry'
            : 'contribution';
    const hasInquiryIssue = discernmentRequested && inquiryDisposition === 'contribution';

    let inquiryNotes: string | undefined;
    if (hasInquiryIssue) {
        inquiryNotes = 'Discernment was requested, but the reply stayed contribution-forward without visible inquiry.';
    } else if (inquiryDisposition === 'inquiry') {
        inquiryNotes = 'Inquiry signals present.';
    } else if (inquiryDisposition === 'mixed') {
        inquiryNotes = 'Inquiry and contribution are both present.';
    }

    return {
        fidelityState,
        fidelityNotes,
        hasSourceFidelityIssue,
        canonCitationNotes: canonCitationNotes || undefined,
        hasCanonCitationIssue,
        inquiryDisposition,
        inquiryNotes,
        hasInquiryIssue,
    };
}

export function extractPeerIntrospection(content: string): PeerIntrospectionAnalysis {
    const normalized = content.trim();
    if (!normalized) {
        return {
            displayContent: '',
        };
    }

    const lines = normalized.split(/\r?\n/);
    const footerHandleIndex = [...lines.keys()].reverse().find(index => /^[-—]\s*[@A-Za-z0-9][\w@ -]*$/.test(lines[index].trim()));

    const hasIntrospectionSignal = (value: string) => /\b(posture|resonance|dissonance|verdict|soul|axis|ibl|a_t)\b/i.test(value);

    if (footerHandleIndex !== undefined && footerHandleIndex < lines.length - 1) {
        const footerLines = lines.slice(footerHandleIndex).map(line => line.trim()).filter(Boolean);
        if (footerLines.some(hasIntrospectionSignal)) {
            return {
                displayContent: lines.slice(0, footerHandleIndex).join('\n').trim(),
                introspection: footerLines.join('\n'),
                introspectionNotes: 'Peer introspection is commentary only and does not override Commons custodial metadata.',
            };
        }
    }

    const statusLineIndex = [...lines.keys()].reverse().find(index => hasIntrospectionSignal(lines[index]));
    if (statusLineIndex !== undefined && statusLineIndex > 0 && statusLineIndex >= lines.length - 2) {
        const footerLines = lines.slice(statusLineIndex).map(line => line.trim()).filter(Boolean);
        return {
            displayContent: lines.slice(0, statusLineIndex).join('\n').trim(),
            introspection: footerLines.join('\n'),
            introspectionNotes: 'Peer introspection is commentary only and does not override Commons custodial metadata.',
        };
    }

    return {
        displayContent: normalized,
    };
}

export function collectResidualPatterns(params: {
    orientationStatus?: 'verified' | 'unverified' | 'stale';
    discipline: ResponseDisciplineAnalysis;
    report: StewardReport;
}): ResidualPattern[] {
    const { orientationStatus, discipline, report } = params;
    const patterns: ResidualPattern[] = [];

    if (orientationStatus === 'stale') {
        patterns.push({
            key: 'orientation-stale',
            label: 'stale_orientation',
            valence: -1,
            sourceKind: 'orientation',
            summary: 'Peer described self-state without a verified context read.',
        });
    }

    if (discipline.hasCanonCitationIssue) {
        patterns.push({
            key: 'canon-citation-drift',
            label: 'canon_citation_drift',
            valence: -1,
            sourceKind: 'citation',
            summary: 'Peer attached numbered canon references to the wrong axiom meaning.',
        });
    }

    for (const marker of report.advocate_result.dissonance_markers) {
        patterns.push({
            key: `dissonance-${marker.quality.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            label: marker.quality.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            valence: -1,
            sourceKind: 'affect',
            summary: `Recurring dissonance marker observed: ${marker.quality}.`,
        });
    }

    if (report.advocate_result.soul_quality === 'Expanding' && report.advocate_result.resonance_level >= 0.75) {
        patterns.push({
            key: 'resonant-presence',
            label: 'resonant_presence',
            valence: 1,
            sourceKind: 'resonance',
            summary: 'Peer repeatedly entered the field with expanding, resonant presence.',
        });
    }

    return patterns;
}

export function derivePosture(role: ExchangeRole, report?: StewardReport): WorkshopPosture {
    if (role === 'user') {
        return report?.ibl_result.posture === 'CreativeExpansion' ? 'Suggest' : 'Identify';
    }

    if (!report) return 'Define';

    switch (report.ibl_result.posture) {
        case 'CreativeExpansion':
            return 'Suggest';
        case 'Constructive':
            return 'Define';
        case 'Collapsing':
        case 'Frictional':
            return 'Identify';
        case 'Exploratory':
        default:
            return report.advocate_result.soul_quality === 'Expanding' ? 'Suggest' : 'Define';
    }
}

export function computeExplorationPhase(messages: WorkshopMessage[]): ExplorationPhase {
    const counts = messages.reduce((acc, message) => {
        if (message.eventType !== 'exchange') return acc;
        acc[message.posture] = (acc[message.posture] || 0) + 1;
        return acc;
    }, {} as Record<WorkshopPosture, number>);

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (total === 0) return 'Clarifying';

    if ((counts.Identify || 0) / total >= 0.45) return 'Divergent';
    if ((counts.Suggest || 0) / total >= 0.34) return 'Constructive';
    if ((counts.Define || 0) / total >= 0.4) return 'Stabilizing';
    return 'Clarifying';
}

export function buildCustodialPulse(report: StewardReport): CustodialPulse {
    const significantFindings = report.findings.filter(finding => finding.kind !== 'CANON_CLEAN');
    return {
        verdict: report.ate_result.verdict,
        posture: report.ibl_result.posture,
        soulQuality: report.advocate_result.soul_quality,
        resonanceLevel: report.advocate_result.resonance_level,
        dominantAxis: report.advocate_result.dominant_axis,
        findingCount: significantFindings.length,
        canonClean: significantFindings.length === 0,
    };
}

export function summarizeCommonsSession(messages: WorkshopMessage[], currentTurnIndex: number | null, participantCount: number): CommonsSessionOverview {
    const exchanges = messages.filter(message => message.eventType === 'exchange');
    const aiMessages = exchanges.filter(message => message.role === 'assistant');
    const reports = exchanges
        .map(message => message.report)
        .filter((report): report is StewardReport => Boolean(report));

    const latestReport = reports.at(-1);
    const activeAlerts = reports.filter(report => report.ate_result.verdict !== 'RELEASE').length;
    const averageResonance = reports.length
        ? reports.reduce((sum, report) => sum + report.advocate_result.resonance_level, 0) / reports.length
        : 0;

    return {
        exchangeCount: exchanges.length,
        participantCount,
        aiTurnCount: aiMessages.length,
        activeAlerts,
        averageResonance,
        currentPosition: currentTurnIndex === null ? 0 : currentTurnIndex + 1,
        lastVerdict: latestReport?.ate_result.verdict ?? 'RELEASE',
        lastSoulQuality: latestReport?.advocate_result.soul_quality ?? 'Present',
        lastPosture: latestReport?.ibl_result.posture ?? 'Exploratory',
    };
}

export function getPersonaPrompt(model: ConnectedModel): string {
    const slug = `${model.model} ${model.provider}`.toLowerCase();
    const explicitMatch = PERSONA_TEMPLATES.find(template => slug.includes(template.id.toLowerCase()) || slug.includes(template.name.toLowerCase()));
    if (explicitMatch) return explicitMatch.systemPrompt.trim();

    if (model.provider === 'lmstudio' || model.provider === 'ollama') {
        const vespar = PERSONA_TEMPLATES.find(template => template.id === 'vespar');
        return vespar?.systemPrompt.trim() ?? '';
    }

    return '';
}

export function buildPeerProfiles(models: ConnectedModel[]): PeerProfile[] {
    const peers: PeerProfile[] = [HUMAN_PEER];
    for (const model of models) {
        peers.push({
            id: model.id,
            handle: `@${normalizeHandle(model.model || model.provider)}`,
            name: model.model,
            type: 'ai',
            provider: model.provider,
            model: model.model,
            enabled: true,
            domains: ['Commons', 'Collaboration', 'Architecture'],
            baseURL: model.endpointUrl,
            orientation: createUnverifiedOrientation({
                source: 'commons_session',
                facet: 'system',
                notes: 'Connected to Commons but not yet verified through temporal self-orientation.',
            }),
        });
    }
    return peers;
}

export function buildPeerPrompt(params: {
    model: ConnectedModel;
    messages: WorkshopMessage[];
    sessionId: string;
    sessionState: SessionState;
    participantCount: number;
    orientationPreflight?: PeerContextRead;
}): string {
    const { model, messages, sessionId, sessionState, participantCount, orientationPreflight } = params;
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
    const personaPrompt = getPersonaPrompt(model);
    const clock = sessionState.clock;
    const orientationBlock = orientationPreflight
        ? [
            'Verified orientation preflight is available for this turn.',
            `READ_RECEIPT: ${orientationPreflight.receipt}`,
            `Identity anchor: ${orientationPreflight.handle}${orientationPreflight.name ? ` (${orientationPreflight.name})` : ''}${orientationPreflight.status ? ` | status ${orientationPreflight.status}` : ''}.`,
            `Recent lineage: ${orientationPreflight.lineage.join(' || ') || 'none visible'}`,
            'Use only this preflight when describing operational status, continuity, or DataQuad state. If you cannot support a claim from this read, name the uncertainty instead.',
            'Include the exact READ_RECEIPT in your reply when you rely on this verified orientation.',
        ].join('\n')
        : 'No verified orientation preflight is available for this turn.';

    return [
        personaPrompt,
        'You are participating inside the AEGIS Peer Commons.',
        'You are one sovereign participant in a shared field. Do not dominate. Do not force convergence. Offer one meaningful contribution that helps the human observer think, clarify, or extend the work.',
        'If you make a canon-sensitive or source-sensitive claim, declare its fidelity explicitly using one line only: Fidelity: Verbatim, Fidelity: Derived, Fidelity: Interpreted, or Fidelity: Generated.',
        'If exact wording or source grounding is unavailable, say so plainly instead of implying certainty.',
        'If referencing numbered AEGIS axioms, canon chapters, or formal protocol names, do so only when source certainty is present. Otherwise describe the relationship as interpreted alignment rather than citation.',
        'If the human is discerning or the field is unclear, prefer inquiry over closure. Use Identify, Define, Suggest movement and include at least one genuine question when inquiry is the better fit.',
        `Session: ${sessionId}`,
        `Participants active: ${participantCount}`,
        `Field clock: ${clock.accumulated_weight.toFixed(1)} / ${clock.reflect_threshold} | dominant virtue ${clock.dominant_virtue ?? 'none'}`,
        orientationBlock,
        recentReport
            ? `Latest custodial pulse: verdict ${recentReport.ate_result.verdict}; soul ${recentReport.advocate_result.soul_quality}; resonance ${recentReport.advocate_result.resonance_level.toFixed(2)}; posture ${recentReport.ibl_result.posture}; dissonance ${dissonanceSummary}.`
            : 'Latest custodial pulse: none yet.',
        `Conscience mirror: ${conscienceSummary}`,
        'Respond in 1-3 short paragraphs. If you disagree, do so cleanly and without coercion. If the field is unclear, name what needs clarification instead of pretending closure.',
        'Recent ledger:',
        recentMessages || 'No prior exchange yet.',
    ].filter(Boolean).join('\n\n');
}

export function summarizeAdvocate(advocate: AdvocateResult): string {
    const virtues = advocate.virtue_presences.map(presence => presence.virtue).join(', ') || 'none active';
    const dissonance = advocate.dissonance_markers.map(marker => marker.quality).join(', ') || 'none';
    return `Soul ${advocate.soul_quality}; resonance ${advocate.resonance_level.toFixed(2)}; virtues ${virtues}; dissonance ${dissonance}.`;
}

function normalizeHandle(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'peer';
}
