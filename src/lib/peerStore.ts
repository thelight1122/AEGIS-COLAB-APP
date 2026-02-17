
import { MOCK_PEERS } from '../types';
import type { Peer } from '../types';
import { isE2E } from './e2e';

export const PEER_STORAGE_KEY = 'aegis-peers-registry';

export function loadPeers(): Peer[] {
    try {
        const stored = localStorage.getItem(PEER_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }

    // In E2E mode, we start with a clean slate unless storage is seeded.
    if (isE2E()) {
        return [];
    }

    return MOCK_PEERS.map((p) => ({ ...p }));
}

export function savePeers(peers: Peer[]) {
    localStorage.setItem(PEER_STORAGE_KEY, JSON.stringify(peers));
}
