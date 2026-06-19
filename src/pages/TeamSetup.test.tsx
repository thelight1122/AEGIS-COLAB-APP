/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamSetup from './TeamSetup';

vi.mock('../contexts/KeyringContext', () => ({
    useKeyring: () => ({
        status: 'unlocked',
        hasEncryptedKey: vi.fn(() => true),
    }),
}));

vi.mock('../contexts/ProviderStatusContext', () => ({
    useProviderStatus: () => ({
        providerHealth: {},
        probeLocalProvider: vi.fn(async () => 'ok'),
    }),
}));

const peerPreset = {
    id: 'preset-live-lesson',
    name: 'Live Lesson Set',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    peers: [{
        peerId: 'peer-aeon',
        handle: '@aeon',
        kind: 'ai',
        provider: 'lmstudio',
        model: 'aeon-local',
        enabled: true,
        baseURL: 'http://localhost:1234/v1',
        systemPrompt: 'Preserve this prompt.',
        contextFiles: [{ name: 'canon.md', content: 'Canon context' }],
        dataQuad: ['foundation-memory'],
    }],
};

describe('TeamSetup', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it('shows saved peer sets and loads one into the active participant set', async () => {
        localStorage.setItem('aegis.team_presets.v1', JSON.stringify([peerPreset]));

        render(
            <MemoryRouter>
                <TeamSetup />
            </MemoryRouter>
        );

        expect(screen.getByText('Saved Peer Sets')).toBeInTheDocument();
        expect(screen.getByText('Live Lesson Set')).toBeInTheDocument();
        expect(screen.getByText('@aeon')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Load Set' }));

        const activeTeam = JSON.parse(localStorage.getItem('aegis.activeTeam.v1') ?? '{}');
        expect(activeTeam.loadedPresetId).toBe('preset-live-lesson');
        expect(activeTeam.selectedPeerIds).toEqual(['peer-aeon']);
        expect(screen.getByText('Active')).toBeInTheDocument();

        const peers = JSON.parse(localStorage.getItem('aegis.peers.v1') ?? '[]');
        expect(peers.find((peer: { id: string }) => peer.id === 'peer-aeon')).toMatchObject({
            systemPrompt: 'Preserve this prompt.',
            contextFiles: [{ name: 'canon.md', content: 'Canon context' }],
            dataQuad: ['foundation-memory'],
            baseURL: 'http://localhost:1234/v1',
        });
    });
});
