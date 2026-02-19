import type { PeerProfile } from "./types";

const STORAGE_KEY = "aegis.peers.v0";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadPeers(): PeerProfile[] {
    const data = safeParse<PeerProfile[]>(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
}

export function savePeers(peers: PeerProfile[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(peers));
}

export function addPeer(peers: PeerProfile[], profile: Omit<PeerProfile, "id">): PeerProfile[] {
    const newPeer: PeerProfile = {
        ...profile,
        id: `p-${crypto.randomUUID()}`,
    };
    return [...peers, newPeer];
}

export function updatePeer(peers: PeerProfile[], id: string, updates: Partial<PeerProfile>): PeerProfile[] {
    return peers.map((p) => (p.id === id ? { ...p, ...updates } : p));
}

export function deletePeer(peers: PeerProfile[], id: string): PeerProfile[] {
    return peers.filter((p) => p.id !== id);
}
