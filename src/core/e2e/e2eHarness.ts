import { PEER_STORAGE_KEY } from '../../lib/peerStore';

/**
 * E2E Harness for deterministic state management in Playwright tests.
 * Exposed via window.__AEGIS_E2E__
 */
export const e2eHarness = {
    /**
     * Resets all relevant local storage keys to a clean state.
     */
    resetAppState: () => {
        localStorage.clear();
        // Specifically clear the keys we know about to be safe
        localStorage.removeItem('aegis.sessions.v0');
        localStorage.removeItem('aegis-peers-registry');
        localStorage.removeItem('aegis_events_current-artifact');
        localStorage.removeItem('aegis_metadata_current-artifact');
        localStorage.removeItem('aegis_ops_current-artifact');
        console.log('[E2E] App state reset performed.');
    },

    /**
     * Seeds a scenario where the artifact is ready for locking after basic actions.
     * This avoids manual localStorage manipulation in test files.
     */
    seedScenarioLockableAfterActions: () => {
        const e2ePeers = [
            { id: 'p1', name: 'User', type: 'human', role: 'Facilitator', status: 'online', acknowledged: false, domains: ['Engineering', 'Operational Layer'] },
            { id: 'p3', name: 'Sarah', type: 'human', role: 'Product', status: 'online', acknowledged: false, domains: ['Product'] },
        ];
        localStorage.setItem(PEER_STORAGE_KEY, JSON.stringify(e2ePeers));

        localStorage.setItem("aegis_metadata_current-artifact", JSON.stringify({
            title: "Operational Layer — Prism Refract Behavior",
            domains: ["Operational Layer", "Product", "Engineering"]
        }));

        localStorage.setItem("aegis.sessions.v0", JSON.stringify([]));
        localStorage.setItem("aegis_events_current-artifact", JSON.stringify([]));
        localStorage.setItem("aegis_ops_current-artifact", JSON.stringify([]));

        console.log('[E2E] Scenario "Lockable-After-Actions" seeded (Product lens required).');
    },

    /**
     * Directly seeds a "ready to lock" state if needed for shortcuts.
     */
    seedReadyToLock: () => {
        const e2ePeers = [
            { id: 'p1', name: 'User', type: 'human', role: 'Facilitator', status: 'online', acknowledged: false, domains: ['Engineering'] },
        ];
        localStorage.setItem(PEER_STORAGE_KEY, JSON.stringify(e2ePeers));

        const lockableEvents = [
            { type: 'AWARENESS_ACK', peerId: 'p1', timestamp: Date.now() },
            // This would make Engineering acknowledged. 
            // If artifact is Engineering only, it would be lockable.
        ];
        localStorage.setItem('aegis_events_current-artifact', JSON.stringify(lockableEvents));

        // Also need to set metadata to Engineering
        localStorage.setItem('aegis_metadata_current-artifact', JSON.stringify({
            title: 'Engineering Validated Protocol',
            domains: ['Engineering']
        }));

        console.log('[E2E] Scenario "Ready-To-Lock" seeded.');
    }
};

// Type definition for window augmentation
declare global {
    interface Window {
        __AEGIS_E2E__?: typeof e2eHarness;
    }
}
