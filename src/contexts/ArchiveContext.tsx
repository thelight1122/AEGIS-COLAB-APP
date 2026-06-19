import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    hasArchive,
    getManifest,
    archiveContent,
    retrieveContent,
    deleteArchiveEntry,
    exportArchive,
    importArchive,
} from '../core/archive/archiveVault';
import type { ArchiveManifest, ArchiveEntry } from '../core/archive/types';

export type ArchiveLockStatus = 'locked' | 'unlocked' | 'empty';

interface ArchiveContextType {
    status: ArchiveLockStatus;
    manifest: ArchiveManifest | null;
    unlockArchive: (passphrase: string) => Promise<boolean>;
    lockArchive: () => void;
    setupArchive: (passphrase: string) => Promise<void>;
    archiveItem: (title: string, contentType: any, payload: object, tags: string[]) => Promise<string>;
    retrieveItem: (id: string) => Promise<any>;
    removeItem: (id: string) => void;
    exportVault: () => Promise<void>;
    importVault: (file: File) => Promise<number>;
}

const ArchiveContext = createContext<ArchiveContextType | null>(null);

export function ArchiveProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<ArchiveLockStatus>('empty');
    const [passphrase, setPassphrase] = useState<string | null>(null);
    const [manifest, setManifest] = useState<ArchiveManifest | null>(null);

    useEffect(() => {
        if (hasArchive()) {
            setStatus('locked');
        } else {
            setStatus('empty');
        }
    }, []);

    const unlockArchive = async (passphraseInput: string): Promise<boolean> => {
        try {
            // Test unlock by fetching manifest
            const currentManifest = getManifest();
            // Test decryption on the first item if manifest has entries
            if (currentManifest.entries.length > 0) {
                await retrieveContent(passphraseInput, currentManifest.entries[0].id);
            }
            setPassphrase(passphraseInput);
            setManifest(currentManifest);
            setStatus('unlocked');
            return true;
        } catch (err) {
            // Decryption failed or wrong passphrase
            console.error('[ArchiveContext] unlock failed', err);
            return false;
        }
    };

    const lockArchive = () => {
        setPassphrase(null);
        setManifest(null);
        setStatus('locked');
    };

    const setupArchive = async (passphraseInput: string) => {
        setPassphrase(passphraseInput);
        const emptyManifest: ArchiveManifest = { version: 'aegis_archive_v1', entries: [] };
        localStorage.setItem('aegis_archive_manifest_v1', JSON.stringify(emptyManifest));
        setManifest(emptyManifest);
        setStatus('unlocked');
    };

    const archiveItem = async (
        title: string,
        contentType: any,
        payload: object,
        tags: string[]
    ): Promise<string> => {
        if (status !== 'unlocked' || !passphrase) {
            throw new Error('Archive is locked.');
        }

        const id = await archiveContent(
            passphrase,
            {
                title,
                contentType,
                archivedBy: '@tracey',
                tags,
            },
            payload
        );

        // Refresh manifest
        setManifest(getManifest());
        return id;
    };

    const retrieveItem = async (id: string): Promise<any> => {
        if (status !== 'unlocked' || !passphrase) {
            throw new Error('Archive is locked.');
        }
        return await retrieveContent(passphrase, id);
    };

    const removeItem = (id: string) => {
        deleteArchiveEntry(id);
        setManifest(getManifest());
    };

    const exportVault = async () => {
        if (status !== 'unlocked' || !passphrase) return;
        const blob = await exportArchive(passphrase);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aegis-archive-${new Date().toISOString().slice(0, 10)}.aegis`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importVault = async (file: File): Promise<number> => {
        if (status !== 'unlocked' || !passphrase) {
            throw new Error('Archive is locked.');
        }
        const count = await importArchive(passphrase, file);
        setManifest(getManifest());
        return count;
    };

    return (
        <ArchiveContext.Provider value={{
            status,
            manifest,
            unlockArchive,
            lockArchive,
            setupArchive,
            archiveItem,
            retrieveItem,
            removeItem,
            exportVault,
            importVault,
        }}>
            {children}
        </ArchiveContext.Provider>
    );
}

export function useArchive() {
    const context = useContext(ArchiveContext);
    if (!context) {
        throw new Error('useArchive must be used within ArchiveProvider');
    }
    return context;
}
