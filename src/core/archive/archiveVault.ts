import type { ArchiveEntry, ArchiveManifest, ArchiveContentType } from './types';

const ARCHIVE_MANIFEST_KEY = 'aegis_archive_manifest_v1';
const ARCHIVE_PAYLOAD_PREFIX = 'aegis_archive_payload_';
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

export function hasArchive(): boolean {
    return !!localStorage.getItem(ARCHIVE_MANIFEST_KEY);
}

export function getManifest(): ArchiveManifest {
    const raw = localStorage.getItem(ARCHIVE_MANIFEST_KEY);
    if (!raw) return { version: 'aegis_archive_v1', entries: [] };
    try {
        return JSON.parse(raw);
    } catch {
        return { version: 'aegis_archive_v1', entries: [] };
    }
}

function saveManifest(manifest: ArchiveManifest): void {
    localStorage.setItem(ARCHIVE_MANIFEST_KEY, JSON.stringify(manifest));
}

/**
 * Encrypts and archives a payload object under a new manifest entry.
 */
export async function archiveContent(
    passphrase: string,
    params: {
        title: string;
        contentType: ArchiveContentType;
        archivedBy: string;
        tags: string[];
    },
    payload: object
): Promise<string> {
    const id = `ae-${crypto.randomUUID()}`;
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(passphrase, salt.buffer);

    const encoder = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer },
        key,
        encoder.encode(JSON.stringify(payload))
    );

    const manifest = getManifest();
    const now = new Date().toISOString();

    const manifestEntry = {
        id,
        title: params.title,
        contentType: params.contentType,
        archivedAt: now,
        archivedBy: params.archivedBy,
        tags: params.tags,
        salt: arrayBufferToBase64(salt.buffer),
        iv: arrayBufferToBase64(iv.buffer),
    };

    manifest.entries.push(manifestEntry);
    saveManifest(manifest);

    // Save encrypted payload separately in local storage
    const encryptedPayload = arrayBufferToBase64(cipherBuffer);
    localStorage.setItem(`${ARCHIVE_PAYLOAD_PREFIX}${id}`, encryptedPayload);

    return id;
}

/**
 * Decrypts and retrieves a payload object.
 */
export async function retrieveContent(
    passphrase: string,
    entryId: string
): Promise<any> {
    const manifest = getManifest();
    const entry = manifest.entries.find(e => e.id === entryId);
    if (!entry) throw new Error('Archive entry not found');

    const encryptedPayload = localStorage.getItem(`${ARCHIVE_PAYLOAD_PREFIX}${entryId}`);
    if (!encryptedPayload) throw new Error('Archive payload not found');

    try {
        const salt = base64ToArrayBuffer(entry.salt);
        const iv = base64ToArrayBuffer(entry.iv);
        const cipher = base64ToArrayBuffer(encryptedPayload);
        const key = await deriveKey(passphrase, salt);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            cipher
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBuffer));
    } catch (err) {
        console.error('[ArchiveVault] Retrieve/Decrypt failed:', err);
        throw new Error('Unlock failed. Please check your passphrase.');
    }
}

/**
 * Deletes an archive entry and its payload.
 */
export function deleteArchiveEntry(id: string): void {
    const manifest = getManifest();
    manifest.entries = manifest.entries.filter(e => e.id !== id);
    saveManifest(manifest);
    localStorage.removeItem(`${ARCHIVE_PAYLOAD_PREFIX}${id}`);
}

/**
 * Exports the entire vault (manifest and payloads) into a single encrypted Blob.
 */
export async function exportArchive(passphrase: string): Promise<Blob> {
    const manifest = getManifest();
    const exportBundle: Record<string, any> = {
        manifest,
        payloads: {},
    };

    for (const entry of manifest.entries) {
        const payload = localStorage.getItem(`${ARCHIVE_PAYLOAD_PREFIX}${entry.id}`);
        if (payload) {
            exportBundle.payloads[entry.id] = payload;
        }
    }

    // Encrypt the entire bundle for export safety
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    const key = await deriveKey(passphrase, salt.buffer);

    const encoder = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv.buffer },
        key,
        encoder.encode(JSON.stringify(exportBundle))
    );

    const filePayload = {
        version: 1,
        salt: arrayBufferToBase64(salt.buffer),
        iv: arrayBufferToBase64(iv.buffer),
        cipher: arrayBufferToBase64(cipherBuffer),
    };

    return new Blob([JSON.stringify(filePayload, null, 2)], { type: 'application/json' });
}

/**
 * Imports a vault bundle from an encrypted file.
 */
export async function importArchive(passphrase: string, file: File): Promise<number> {
    const text = await file.text();
    const filePayload = JSON.parse(text);

    if (filePayload.version !== 1 || !filePayload.salt || !filePayload.iv || !filePayload.cipher) {
        throw new Error('Invalid archive file format.');
    }

    try {
        const salt = base64ToArrayBuffer(filePayload.salt);
        const iv = base64ToArrayBuffer(filePayload.iv);
        const cipher = base64ToArrayBuffer(filePayload.cipher);
        const key = await deriveKey(passphrase, salt);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            cipher
        );

        const decoder = new TextDecoder();
        const bundle = JSON.parse(decoder.decode(decryptedBuffer));

        const incomingManifest = bundle.manifest as ArchiveManifest;
        const currentManifest = getManifest();

        let importCount = 0;
        for (const entry of incomingManifest.entries) {
            // Check if already exists to prevent duplicate imports
            if (currentManifest.entries.some(e => e.id === entry.id)) continue;

            const payload = bundle.payloads[entry.id];
            if (payload) {
                currentManifest.entries.push(entry);
                localStorage.setItem(`${ARCHIVE_PAYLOAD_PREFIX}${entry.id}`, payload);
                importCount++;
            }
        }

        saveManifest(currentManifest);
        return importCount;
    } catch (err) {
        console.error('[ArchiveVault] Import failed:', err);
        throw new Error('Import failed. Invalid passphrase or corrupted file.');
    }
}
