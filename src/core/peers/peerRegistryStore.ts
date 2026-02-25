import type { PeerProfile } from "./types";

const STORAGE_KEY = "aegis.peers.v1";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadPeers(): PeerProfile[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeParse<unknown[]>(raw);

    if (Array.isArray(data)) {
        let migrationNeeded = false;
        const sanitized = data.map((rawItem: unknown) => {
            if (!rawItem || typeof rawItem !== 'object') return rawItem as PeerProfile;
            const item = rawItem as Record<string, unknown>;
            if (item.provider === 'local') {
                item.provider = 'lmstudio';
                migrationNeeded = true;
            }
            if (item.provider === 'grok') {
                item.provider = 'xai';
                migrationNeeded = true;
            }
            if ('apiKey' in item) {
                delete item.apiKey;
                migrationNeeded = true;
            }
            return item as unknown as PeerProfile;
        });

        if (migrationNeeded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        }
        return sanitized;
    }

    return [];
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
