import type { LLMProvider } from "../peers/types";

export type ProviderReadinessState =
    | "locked"
    | "missing_key"
    | "missing_config"
    | "ready"
    | "unreachable";

export type ProviderReadiness = {
    state: ProviderReadinessState;
    reason?: string;
};

export function getProviderReadiness(args: {
    provider: LLMProvider;
    keyringState: "locked" | "unlocked" | "empty";
    hasEncryptedKey: (provider: LLMProvider) => boolean; // metadata only
    baseURL?: string;
    model?: string;
    health?: "ok" | "fail" | "unknown";
    localAuthRequired?: boolean;
}): ProviderReadiness {
    const { provider, keyringState, hasEncryptedKey, baseURL, model, health, localAuthRequired } = args;

    if (['openai', 'gemini', 'anthropic', 'xai'].includes(provider)) {
        if (keyringState === "locked") return { state: "locked", reason: "Vault is locked." };
        if (!hasEncryptedKey(provider)) return { state: "missing_key", reason: "No API key found in vault." };
        if (!model) return { state: "missing_config", reason: "Model is required." };
        if (health === "fail") return { state: "unreachable", reason: "Service health check failed." };
        return { state: "ready" };
    }

    if (provider === 'lmstudio' || provider === 'ollama') {
        if (!baseURL) return { state: "missing_config", reason: "Base URL is required." };
        if (localAuthRequired) {
            if (keyringState === "locked") return { state: "locked", reason: "Vault is locked (auth required)." };
            if (!hasEncryptedKey(provider)) return { state: "missing_key", reason: "Auth key not found in vault." };
        }
        // Most Local UIs don't strictly require model, but we check if empty and provider is lmstudio
        if (provider === 'lmstudio' && !model) return { state: "missing_config", reason: "Model is required for LM Studio." };
        if (health === "fail") return { state: "unreachable", reason: "Local endpoint is unreachable." };
        return { state: "ready" };
    }

    return { state: "missing_config", reason: "Unknown provider." };
}
