export { };

declare global {
    interface Window {
        __AEGIS_E2E__?: {
            resetAppState: () => void;
            seedScenarioLockableAfterActions: () => void;
        };
    }
}
