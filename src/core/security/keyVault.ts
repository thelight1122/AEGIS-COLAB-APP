/**
 * AEGIS Local Key Vault
 * Implements AES-GCM encryption-at-rest for provider API keys.
 * Keys are derived from a user passphrase using PBKDF2.
 * Decrypted keys exist only in reactive memory during the session.
 */

export type VaultProviderId = 'openai' | 'gemini' | 'anthropic' | 'grok' | 'lmstudio' | 'ollama';

export type VaultRecord = {
    providerId: VaultProviderId;
    createdAt: number;
    updatedAt: number;
    // ciphertext bundle
    saltB64: string;
    ivB64: string;
    cipherB64: string;
};

export type VaultState = {
    version: 1;
    records: VaultRecord[];
};

const STORAGE_KEY = 'aegis_secure_vault_v1';
const PBKDF2_ITERATIONS = 310000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

// --- Helper Utilities ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Derives a cryptographic key from a passphrase and salt.
 */
async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// --- Public API ---

export function hasVault(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
}

export function wipeVault(): void {
    localStorage.removeItem(STORAGE_KEY);
}

function getVault(): VaultState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, records: [] };
    try {
        return JSON.parse(raw);
    } catch {
        return { version: 1, records: [] };
    }
}

function saveVault(vault: VaultState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

/**
 * Creates/overwrites a single provider secret.
 */
export async function upsertSecret(
    passphrase: string,
    providerId: VaultProviderId,
    secret: string
): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(passphrase, salt.buffer);

    const encoder = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer },
        key,
        encoder.encode(secret)
    );

    const vault = getVault();
    const existingIdx = vault.records.findIndex(r => r.providerId === providerId);

    const now = Date.now();
    const record: VaultRecord = {
        providerId,
        createdAt: existingIdx >= 0 ? vault.records[existingIdx].createdAt : now,
        updatedAt: now,
        saltB64: arrayBufferToBase64(salt.buffer),
        ivB64: arrayBufferToBase64(iv.buffer),
        cipherB64: arrayBufferToBase64(cipherBuffer)
    };

    if (existingIdx >= 0) {
        vault.records[existingIdx] = record;
    } else {
        vault.records.push(record);
    }

    saveVault(vault);
}

/**
 * Decrypts a single provider secret.
 */
export async function getSecret(
    passphrase: string,
    providerId: VaultProviderId
): Promise<string | null> {
    const vault = getVault();
    const record = vault.records.find(r => r.providerId === providerId);
    if (!record) return null;

    try {
        const salt = base64ToArrayBuffer(record.saltB64);
        const iv = base64ToArrayBuffer(record.ivB64);
        const cipher = base64ToArrayBuffer(record.cipherB64);
        const key = await deriveKey(passphrase, salt);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            cipher
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch {
        throw new Error('Unlock failed'); // Generic error
    }
}

/**
 * Decrypts all available secrets in the vault.
 */
export async function unlockAll(passphrase: string): Promise<Record<string, string>> {
    const vault = getVault();
    const result: Record<string, string> = {};

    for (const record of vault.records) {
        const decrypted = await getSecret(passphrase, record.providerId);
        if (decrypted) {
            result[record.providerId] = decrypted;
        }
    }

    return result;
}

export function removeSecret(providerId: VaultProviderId): void {
    const vault = getVault();
    vault.records = vault.records.filter(r => r.providerId !== providerId);
    saveVault(vault);
}
