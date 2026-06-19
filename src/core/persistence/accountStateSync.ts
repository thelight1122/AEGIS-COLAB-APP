// Account state sync removed — no remote DB in this app.
export type AccountStateSyncStatus = 'idle';
export interface AccountStateSyncSnapshot { status: AccountStateSyncStatus; error: null; lastSyncedAt: null; }
export type AccountStateSyncListener = (s: AccountStateSyncSnapshot) => void;

const SNAPSHOT: AccountStateSyncSnapshot = { status: 'idle', error: null, lastSyncedAt: null };
export function getAccountStateSyncSnapshot() { return SNAPSHOT; }
export function subscribeAccountStateSync(listener: AccountStateSyncListener) {
    listener(SNAPSHOT);
    return () => {};
}
export function startAccountStateSync() { return () => {}; }
export function shouldSyncLocalStorageKey() { return false; }
