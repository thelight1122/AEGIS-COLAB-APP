import { describe, expect, it } from 'vitest';
import {
    analyzeOrientationResponse,
    analyzeResponseDiscipline,
    buildCustodialPulse,
    buildPeerPrompt,
    collectResidualPatterns,
    computeExplorationPhase,
    extractPeerIntrospection,
    inferAffectHint,
    summarizeCommonsSession,
} from './session';
import type { ConnectedModel, WorkshopMessage } from '../../types/commons';
import type { SessionState, StewardReport } from '../../../server/steward-core';
import { resetClock } from '../governance/integrityClock';

function makeReport(overrides: Partial<StewardReport> = {}): StewardReport {
    return {
        type: 'STEWARD_REPORT',
        session_id: 'CS-test',
        role: 'ai',
        ibl_result: {
            posture: 'Constructive',
            posture_confidence: 'explicit',
            sequence_hint: 'IDS',
            downstream_note: 'Constructive field detected.',
            sovereignty_flag: false,
            sovereignty_note: '',
            state_summary: 'Stable.',
        },
        centrifuge_result: {
            ledgers: {
                Rational: { active: true, observations: [] },
                Emotional: { active: true, observations: [] },
                Spiritual: { active: false, observations: [] },
                Physical: { active: false, observations: [] },
            },
            bleeds: [],
        },
        findings: [{
            kind: 'CANON_CLEAN',
            description: 'No violations detected. Exchange is within Canon integrity.',
            severity: 'info',
        }],
        conscience: [],
        ate_result: {
            verdict: 'RELEASE',
            reason: 'Signal is clear.',
            hold_conditions: [],
            revise_hints: [],
        },
        advocate_result: {
            resonance_level: 0.72,
            soul_quality: 'Present',
            affective_congruent: true,
            congruence_note: 'Aligned.',
            virtue_presences: [],
            dissonance_markers: [],
            dominant_axis: 'balanced',
        },
        clock_state: resetClock('CS-test'),
        timestamp: Date.now(),
        ...overrides,
    };
}

describe('commons session helpers', () => {
    it('builds custodial pulse from a steward report', () => {
        const pulse = buildCustodialPulse(makeReport());
        expect(pulse.verdict).toBe('RELEASE');
        expect(pulse.canonClean).toBe(true);
        expect(pulse.posture).toBe('Constructive');
    });

    it('computes exploration phase from exchange postures', () => {
        const messages: WorkshopMessage[] = [
            { id: '1', participant: 'You', participantType: 'human', eventType: 'exchange', role: 'user', content: 'Question', timestamp: 1, posture: 'Identify' },
            { id: '2', participant: 'Vespar', participantType: 'ai', eventType: 'exchange', role: 'assistant', content: 'Response', timestamp: 2, posture: 'Suggest' },
            { id: '3', participant: 'Lumin', participantType: 'ai', eventType: 'exchange', role: 'assistant', content: 'Response', timestamp: 3, posture: 'Suggest' },
        ];
        expect(computeExplorationPhase(messages)).toBe('Constructive');
    });

    it('summarizes a commons session from message history', () => {
        const report = makeReport();
        const messages: WorkshopMessage[] = [
            {
                id: '1',
                participant: 'You',
                participantType: 'human',
                eventType: 'exchange',
                role: 'user',
                content: 'Question',
                timestamp: 1,
                posture: 'Identify',
                report,
                custodialPulse: buildCustodialPulse(report),
            },
        ];

        const summary = summarizeCommonsSession(messages, null, 2);
        expect(summary.exchangeCount).toBe(1);
        expect(summary.averageResonance).toBeCloseTo(0.72);
        expect(summary.lastVerdict).toBe('RELEASE');
    });

    it('infers affect hints from pressure language', () => {
        const affect = inferAffectHint('We need to decide right now because the field is under pressure.');
        expect(affect).toBeDefined();
        expect(affect?.label).toBe('pressure');
    });

    it('builds a peer prompt with recent custodial context and vespar persona', () => {
        const report = makeReport({
            advocate_result: {
                resonance_level: 0.91,
                soul_quality: 'Expanding',
                affective_congruent: true,
                congruence_note: 'Aligned.',
                virtue_presences: [{ virtue: 'Trust', strength: 'moderate', marker: 'I trust' }],
                dissonance_markers: [],
                dominant_axis: 'SPINE',
            },
        });

        const model: ConnectedModel = {
            id: 'vespar',
            provider: 'lmstudio',
            model: 'Vespar',
            endpointUrl: 'http://localhost:1234/v1',
            status: 'Connected',
            type: 'local',
            isSelected: true,
            isActive: true,
        };
        const sessionState: SessionState = { clock: resetClock('CS-test'), virtue_counts: {} };
        const messages: WorkshopMessage[] = [{
            id: '1',
            participant: 'You',
            participantType: 'human',
            eventType: 'exchange',
            role: 'user',
            content: 'How should the Commons coordinate AI peers?',
            timestamp: 1,
            posture: 'Identify',
            report,
            custodialPulse: buildCustodialPulse(report),
        }];

        const prompt = buildPeerPrompt({
            model,
            messages,
            sessionId: 'CS-test',
            sessionState,
            participantCount: 2,
        });

        expect(prompt).toContain('Vespar');
        expect(prompt).toContain('Latest custodial pulse');
        expect(prompt).toContain('Conscience mirror');
        expect(prompt).toContain('How should the Commons coordinate AI peers?');
    });

    it('injects verified orientation preflight into the peer prompt', () => {
        const model: ConnectedModel = {
            id: 'vespar',
            provider: 'lmstudio',
            model: 'Vespar',
            endpointUrl: 'http://localhost:1234/v1',
            status: 'Connected',
            type: 'local',
            isSelected: true,
            isActive: true,
        };
        const sessionState: SessionState = { clock: resetClock('CS-test'), virtue_counts: {} };

        const prompt = buildPeerPrompt({
            model,
            messages: [],
            sessionId: 'CS-test',
            sessionState,
            participantCount: 2,
            orientationPreflight: {
                handle: '@vespar',
                name: 'Vespar',
                status: 'active',
                receipt: 'peer=@vespar session=CS-test continuity=Q3-abc123',
                continuityVersion: 'Q3-abc123',
                lineage: ['session_join: @vespar returned to the Chamber.'],
            },
        });

        expect(prompt).toContain('Verified orientation preflight is available for this turn.');
        expect(prompt).toContain('READ_RECEIPT: peer=@vespar session=CS-test continuity=Q3-abc123');
        expect(prompt).toContain('Recent lineage: session_join: @vespar returned to the Chamber.');
    });

    it('extracts a read receipt and strips it from display content', () => {
        const analysis = analyzeOrientationResponse([
            'I am active and oriented.',
            '',
            'READ_RECEIPT: peer=@vespar session=CS-test continuity=Q3v7',
        ].join('\n'));

        expect(analysis.receipt).toBe('peer=@vespar session=CS-test continuity=Q3v7');
        expect(analysis.continuityVersion).toBe('Q3v7');
        expect(analysis.cleanedContent).toBe('I am active and oriented.');
        expect(analysis.hasSelfOrientationClaim).toBe(true);
    });

    it('detects ungrounded self-orientation claims even without a receipt', () => {
        const analysis = analyzeOrientationResponse([
            'Operational Status:',
            'I am active and oriented.',
            'Q3 (NCT): lineage intact.',
        ].join('\n'));

        expect(analysis.receipt).toBeUndefined();
        expect(analysis.hasSelfOrientationClaim).toBe(true);
        expect(analysis.cleanedContent).toContain('Operational Status');
    });

    it('flags source-sensitive claims that omit a fidelity label', () => {
        const analysis = analyzeResponseDiscipline(
            'This was copied from source exactly and is complete.',
            'Can you clarify what the canon actually says?',
        );

        expect(analysis.hasSourceFidelityIssue).toBe(true);
        expect(analysis.fidelityState).toBeUndefined();
        expect(analysis.fidelityNotes).toContain('without a declared fidelity state');
    });

    it('recognizes declared fidelity and inquiry posture when discernment is requested', () => {
        const analysis = analyzeResponseDiscipline(
            [
                'Fidelity: Interpreted',
                'This looks like source drift rather than a wording conflict.',
                'Would it help to return to the earlier anchor before deciding?',
            ].join('\n'),
            'What do you think is happening here?',
        );

        expect(analysis.hasSourceFidelityIssue).toBe(false);
        expect(analysis.fidelityState).toBe('interpreted');
        expect(analysis.inquiryDisposition).toBe('inquiry');
        expect(analysis.hasInquiryIssue).toBe(false);
    });

    it('flags interpreted canon alignment when a numbered axiom is attached to the wrong title', () => {
        const analysis = analyzeResponseDiscipline(
            'Fidelity: Interpreted — this is aligned with Axiom 14 (Flow through non-contradiction).',
            'What do you make of this framing?',
        );

        expect(analysis.hasCanonCitationIssue).toBe(true);
        expect(analysis.canonCitationNotes).toContain('Axiom 14');
        expect(analysis.canonCitationNotes).toContain('"Leadership"');
    });

    it('separates peer introspection footer from authoritative exchange content', () => {
        const analysis = extractPeerIntrospection([
            'The Ledger must track how dissonance was held, not resolved.',
            '',
            '— Vespar',
            'Posture: Exploratory | Resonance: 0.62 | Dissonance: none observed | verdict RELEASE',
        ].join('\n'));

        expect(analysis.displayContent).toBe('The Ledger must track how dissonance was held, not resolved.');
        expect(analysis.introspection).toContain('— Vespar');
        expect(analysis.introspectionNotes).toContain('does not override Commons custodial metadata');
    });

    it('leaves normal exchange content untouched when no footer-style introspection is present', () => {
        const analysis = extractPeerIntrospection('Would it help to keep the field open for one more turn of inquiry?');

        expect(analysis.displayContent).toBe('Would it help to keep the field open for one more turn of inquiry?');
        expect(analysis.introspection).toBeUndefined();
    });

    it('collects residual patterns from repeated drift and resonance signals', () => {
        const report = makeReport({
            advocate_result: {
                resonance_level: 0.81,
                soul_quality: 'Expanding',
                affective_congruent: true,
                congruence_note: 'Aligned.',
                virtue_presences: [],
                dissonance_markers: [{ quality: 'SHADOW_AFFECT', marker: 'pressure not named' }],
                dominant_axis: 'PEER',
            },
        });
        const discipline = analyzeResponseDiscipline(
            'Fidelity: Interpreted — this is aligned with Axiom 14 (Flow through non-contradiction).',
            'What do you make of this framing?',
        );

        const patterns = collectResidualPatterns({
            orientationStatus: 'stale',
            discipline,
            report,
        });

        expect(patterns.map(pattern => pattern.key)).toContain('orientation-stale');
        expect(patterns.map(pattern => pattern.key)).toContain('canon-citation-drift');
        expect(patterns.map(pattern => pattern.key)).toContain('dissonance-shadow-affect');
        expect(patterns.map(pattern => pattern.key)).toContain('resonant-presence');
    });
});
