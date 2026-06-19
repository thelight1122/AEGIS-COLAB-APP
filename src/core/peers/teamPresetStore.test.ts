import { describe, expect, it } from 'vitest';
import { createPresetFromPeers } from './teamPresetStore';
import type { PeerProfile } from './types';

describe('teamPresetStore', () => {
    it('preserves full peer preferences when creating a saved set', () => {
        const peers: PeerProfile[] = [{
            id: 'peer-foundation',
            handle: '@Aeon',
            name: 'Aeon',
            type: 'ai',
            provider: 'ollama',
            model: 'foundation:8b',
            enabled: true,
            classification: 'substrate',
            domains: ['Formation'],
            baseURL: 'http://20.115.97.102:11434/v1',
            notes: 'Foundation work',
            systemPrompt: 'Carry the Foundation orientation.',
            contextFiles: [{ name: 'foundation.md', content: 'Foundation context' }],
            dataQuad: ['foundation-lineage'],
        }];

        const preset = createPresetFromPeers('Foundation', peers);

        expect(preset.peers[0]).toMatchObject({
            peerId: 'peer-foundation',
            handle: '@Aeon',
            provider: 'ollama',
            model: 'foundation:8b',
            classification: 'substrate',
            domains: ['Formation'],
            baseURL: 'http://20.115.97.102:11434/v1',
            notes: 'Foundation work',
            systemPrompt: 'Carry the Foundation orientation.',
            contextFiles: [{ name: 'foundation.md', content: 'Foundation context' }],
            dataQuad: ['foundation-lineage'],
        });
    });
});

