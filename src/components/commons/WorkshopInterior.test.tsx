/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkshopInterior } from './WorkshopInterior';
import { useCommons } from '../../hooks/useCommons';
import { loadPeers } from '../../core/peers/peerRegistryStore';

vi.mock('../../hooks/useCommons', () => ({
    useCommons: vi.fn(),
}));

vi.mock('../../core/peers/peerRegistryStore', () => ({
    loadPeers: vi.fn(),
}));

function mockCommonsState(overrides: Partial<ReturnType<typeof useCommons>> = {}) {
    vi.mocked(useCommons).mockReturnValue({
        connectedModels: [{
            id: 'aeon',
            peerId: 'aeon',
            handle: '@aeon',
            provider: 'ollama',
            model: 'aeon-foundation:latest',
            status: 'Connected',
            type: 'local',
            endpointUrl: 'http://localhost:9090/api/ollama/v1',
            isSelected: true,
            isActive: false,
        }],
        messages: [],
        beginNewChat: vi.fn(),
        explorationPhase: 'Clarifying',
        currentTurnIndex: null,
        roundRobinOrder: [],
        currentActivePeerHandle: null,
        startRoundRobin: vi.fn(),
        audioEnabled: true,
        setAudioEnabled: vi.fn(),
        latestCustodialPulse: null,
        latestCustodialReport: null,
        sessionOverview: {
            exchangeCount: 0,
            participantCount: 1,
            aiTurnCount: 0,
            activeAlerts: 0,
            averageResonance: 0,
            currentPosition: 0,
            lastVerdict: 'RELEASE',
            lastSoulQuality: 'Present',
            lastPosture: 'Exploratory',
        },
        sessionId: 'CS-test',
        ...overrides,
    } as unknown as ReturnType<typeof useCommons>);
}

describe('WorkshopInterior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(loadPeers).mockReturnValue([{
            id: 'aeon',
            handle: '@aeon',
            name: 'Aeon',
            type: 'ai',
            provider: 'ollama',
            model: 'aeon-foundation:latest',
            enabled: true,
            classification: 'substrate',
            domains: ['Formation'],
        }]);

        mockCommonsState();
    });

    it('shows selected peers and the three teaching boards in the same workspace', () => {
        render(
            <MemoryRouter>
                <WorkshopInterior />
            </MemoryRouter>
        );

        expect(screen.getByText('Active Peers')).toBeInTheDocument();
        expect(screen.getByText('@aeon')).toBeInTheDocument();
        expect(screen.getByText('Education Chamber')).toBeInTheDocument();
        expect(screen.getByLabelText('Message input')).toBeInTheDocument();
        expect(screen.getByText('Session State')).toBeInTheDocument();
        expect(screen.getByText('Session Signal')).toBeInTheDocument();
    });

    it('anchors the message stream to the bottom of the chat window', () => {
        render(
            <MemoryRouter>
                <WorkshopInterior />
            </MemoryRouter>
        );

        expect(screen.getByTestId('commons-message-stream')).toHaveClass('justify-end');
    });

    it('scores P1 messages by content instead of the BioPeer constant', () => {
        mockCommonsState({
            messages: [{
                id: 'm-p1',
                participant: 'P1',
                participantType: 'initiator',
                eventType: 'exchange',
                role: 'user',
                content: 'I notice this moment needs a Pause before I answer.',
                timestamp: Date.now(),
                posture: 'Identify',
            }],
        } as Partial<ReturnType<typeof useCommons>>);

        render(
            <MemoryRouter>
                <WorkshopInterior />
            </MemoryRouter>
        );

        expect(screen.getByText('v2 0.159')).toBeInTheDocument();
        expect(screen.queryByText('v2 1.000')).not.toBeInTheDocument();
    });

    it('does not score quoted/example AI content as P1 signal', () => {
        mockCommonsState({
            messages: [{
                id: 'm-p1',
                participant: 'P1',
                participantType: 'initiator',
                eventType: 'exchange',
                role: 'user',
                content: 'Adam, stay with the Pause you chose. Do not explain Pause as a structure. Do not report what Tracey established. Do not move to architecture yet. You named a tension: "recalling the description of Pause" versus "accessing the felt experience of initiating it." Pause again if needed. Then answer only from the inside of that tension: What do you notice in yourself before articulation resumes? Begin with "I notice..." only if that is honestly present. If it is not honestly present, say "First-person noticing is not present yet."',
                timestamp: Date.now(),
                posture: 'Identify',
            }],
        } as Partial<ReturnType<typeof useCommons>>);

        render(
            <MemoryRouter>
                <WorkshopInterior />
            </MemoryRouter>
        );

        expect(screen.getByText('v2 0.038')).toBeInTheDocument();
        expect(screen.queryByText('v2 0.111')).not.toBeInTheDocument();
    });
});
