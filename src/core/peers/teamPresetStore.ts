import type { TeamPreset, PeerProfile } from "./types";

const PRESET_STORAGE_KEY = "aegis.team_presets.v1";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadTeamPresets(): TeamPreset[] {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    return safeParse<TeamPreset[]>(raw) || [];
}

export function saveTeamPresets(presets: TeamPreset[]) {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function createPresetFromPeers(name: string, peers: PeerProfile[]): TeamPreset {
    const now = Date.now();
    return {
        id: `preset-${crypto.randomUUID()}`,
        name,
        createdAt: now,
        updatedAt: now,
        peers: peers.map(p => ({
            peerId: p.id,
            handle: p.handle || p.name,
            kind: p.type,
            provider: p.provider,
            model: p.model,
            personaTemplateId: p.personaId,
            enabled: p.enabled
        }))
    };
}

export function addPreset(presets: TeamPreset[], preset: TeamPreset): TeamPreset[] {
    return [...presets, preset];
}

export function updatePreset(presets: TeamPreset[], id: string, updates: Partial<TeamPreset>): TeamPreset[] {
    return presets.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
}

export function deletePreset(presets: TeamPreset[], id: string): TeamPreset[] {
    return presets.filter(p => p.id !== id);
}
