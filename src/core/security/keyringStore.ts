/**
 * AEGIS In-Memory Keyring Store
 * This is a non-reactive singleton to allow core logic (adapters)
 * to access decrypted keys without needing React Context.
 * The KeyringContext syncs with this store.
 */

let inMemoryKeys: Record<string, string> = {};

export function setRuntimeKeys(keys: Record<string, string>) {
    inMemoryKeys = { ...keys };
}

export function getRuntimeKey(providerId: string): string | null {
    const normalizedId = providerId.toLowerCase();
    // Map some common aliases
    if (normalizedId === 'grok') return inMemoryKeys['grok'] || inMemoryKeys['xai'] || null;
    return inMemoryKeys[normalizedId] || null;
}

export function clearRuntimeKeys() {
    inMemoryKeys = {};
}
