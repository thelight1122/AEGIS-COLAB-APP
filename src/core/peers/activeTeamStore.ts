export type ActiveTeamState = {
    selectedPeerIds: string[];     // active team only
    loadedPresetId?: string | null;
    updatedAt?: number;
};

const STORAGE_KEY = "aegis.activeTeam.session.v1";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function loadActiveTeam(): ActiveTeamState {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const data = safeParse<ActiveTeamState>(raw);

    if (data && Array.isArray(data.selectedPeerIds)) {
        return data;
    }

    return { selectedPeerIds: [], loadedPresetId: null };
}

export function saveActiveTeam(state: ActiveTeamState): void {
    const newState = { ...state, updatedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
}

export function clearActiveTeam(): ActiveTeamState {
    const newState = { selectedPeerIds: [], loadedPresetId: null };
    saveActiveTeam(newState);
    return newState;
}

export function togglePeerSelected(state: ActiveTeamState, peerId: string): ActiveTeamState {
    const isSelected = state.selectedPeerIds.includes(peerId);
    let selectedPeerIds;
    if (isSelected) {
        selectedPeerIds = state.selectedPeerIds.filter((id) => id !== peerId);
    } else {
        selectedPeerIds = [...state.selectedPeerIds, peerId];
    }
    const newState = { ...state, selectedPeerIds };
    saveActiveTeam(newState);
    return newState;
}

export function setSelectedPeerIds(state: ActiveTeamState, peerIds: string[]): ActiveTeamState {
    const newState = { ...state, selectedPeerIds: peerIds };
    saveActiveTeam(newState);
    return newState;
}
