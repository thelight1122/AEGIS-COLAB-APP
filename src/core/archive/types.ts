export type ArchiveContentType =
    | 'session'
    | 'lesson-plan'
    | 'training-protocol'
    | 'formation-method'
    | 'trigger-graph';

export interface ArchiveEntry {
    id: string;
    title: string;
    contentType: ArchiveContentType;
    archivedAt: string;
    archivedBy: string;       // biopeer handle
    tags: string[];
    encryptedPayload: string; // AES-GCM encrypted JSON blob
    salt: string;             // base64-encoded PBKDF2 salt
    iv: string;               // base64-encoded AES-GCM IV
}

export interface ArchiveManifest {
    version: 'aegis_archive_v1';
    entries: Omit<ArchiveEntry, 'encryptedPayload'>[];  // index only — no payloads
}
