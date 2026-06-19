import { loadPeers as loadNewPeers } from '../core/peers/peerRegistryStore';
import type { Peer } from '../types';
import { isE2E } from './e2e';

export const PEER_STORAGE_KEY = 'aegis.peers.v1';

export function loadPeers(): Peer[] {
    const peers = loadNewPeers();

    // In E2E mode, we start with a clean slate unless storage is seeded.
    if (isE2E() && peers.length === 0) {
        return [];
    }

    // Map PeerProfile to Peer for legacy compatibility
    return peers.map(p => ({
        id: p.id,
        name: p.name || p.handle,
        type: p.type,
        role: p.notes?.slice(0, 30) || (p.type === 'ai' ? 'AI Assistant' : 'Human Member'),
        status: p.enabled ? 'online' : 'offline',
        acknowledged: false,
        domains: p.domains || []
    }));
}

export function savePeers(peers: Peer[]) {
    // This is problematic because we can't easily map back to PeerProfile
    // For now, let's keep it as is or migrate the callers to use peerRegistryStore directly.
    localStorage.setItem(PEER_STORAGE_KEY, JSON.stringify(peers));
}
