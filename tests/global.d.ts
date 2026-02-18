export { };

declare global {
    interface Window {
        __AEGIS_E2E__?: {
            resetAppState: () => void;
            seedScenarioLockableAfterActions: () => void;
            seedReadyToLock: () => void;
        };
        __AEGIS_LAST_METADATA__?: any;
    }
}
