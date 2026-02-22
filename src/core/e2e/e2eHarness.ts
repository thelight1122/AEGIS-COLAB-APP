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
            {
                id: 'p1',
                handle: '@user',
                name: 'User',
                type: 'human',
                enabled: true,
                domains: ['Engineering', 'Operational Layer'],
                provider: 'openai', // mock
                model: 'human'
            },
            {
                id: 'p3',
                handle: '@sarah',
                name: 'Sarah',
                type: 'human',
                enabled: true,
                domains: ['Product'],
                provider: 'openai', // mock
                model: 'human'
            },
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
            {
                id: 'p1',
                handle: '@user',
                name: 'User',
                type: 'human',
                enabled: true,
                domains: ['Engineering'],
                provider: 'openai',
                model: 'human'
            },
        ];
        localStorage.setItem(PEER_STORAGE_KEY, JSON.stringify(e2ePeers));

        const lockableEvents = [
            { type: 'AWARENESS_ACK', peerId: 'p1', timestamp: Date.now(), timestamp_utc: new Date().toISOString() },
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
