"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as KeyVault from '../core/security/keyVault';
import { type VaultProviderId } from '../core/security/keyVault';
import { setRuntimeKeys, clearRuntimeKeys } from '../core/security/keyringStore';

export type KeyringStatus = 'locked' | 'unlocked' | 'empty';

interface KeyringContextType {
    status: KeyringStatus;
    keys: Record<string, string>;
    isPersisted: boolean;
    unlock: (passphrase: string, persist?: boolean) => Promise<void>;
    lock: () => void;
    forget: () => void;
    clearPersist: () => void;
    setProviderSecret: (providerId: VaultProviderId, secret: string, passphrase?: string) => Promise<void>;
    hasEncryptedKey: (providerId: VaultProviderId) => boolean;
}

const KeyringContext = createContext<KeyringContextType | undefined>(undefined);

const SESSION_KEY = 'aegis_vault_session';
const PERSIST_KEY = 'aegis_vault_persist';

export function KeyringProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<KeyringStatus>(() => {
        if (typeof window !== 'undefined' && KeyVault.hasVault()) return 'locked';
        return 'empty';
    });
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [currentPassphrase, setCurrentPassphrase] = useState<string | null>(null);
    const [isPersisted, setIsPersisted] = useState(() =>
        typeof window !== 'undefined' && !!localStorage.getItem(PERSIST_KEY)
    );

    // Legacy plaintext stores are intentionally left in place so Settings can guide
    // an explicit migration without silently destroying the user's only copy.
    useEffect(() => {
        const LEGACY_KEYS = ['aegis-system-settings', 'aegis_keys'];
        let foundLegacy = false;

        LEGACY_KEYS.forEach(k => {
            if (localStorage.getItem(k) || sessionStorage.getItem(k)) {
                foundLegacy = true;
            }
        });

        if (foundLegacy) {
            console.warn('AEGIS: Legacy plaintext key settings detected. Open Settings and migrate them into the encrypted vault before clearing old browser storage.');
        }
    }, []);



    const lock = useCallback(() => {
        setKeys({});
        setCurrentPassphrase(null);
        clearRuntimeKeys();
        sessionStorage.removeItem(SESSION_KEY);
        if (KeyVault.hasVault()) {
            setStatus('locked');
        } else {
            setStatus('empty');
        }
    }, []);

    const forget = useCallback(() => {
        KeyVault.wipeVault();
        setKeys({});
        setCurrentPassphrase(null);
        clearRuntimeKeys();
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PERSIST_KEY);
        setIsPersisted(false);
        setStatus('empty');
    }, []);

    const clearPersist = useCallback(() => {
        localStorage.removeItem(PERSIST_KEY);
        setIsPersisted(false);
    }, []);

    const unlock = useCallback(async (passphrase: string, persist?: boolean) => {
        const decryptedKeys = await KeyVault.unlockAll(passphrase);
        setKeys(decryptedKeys);
        setRuntimeKeys(decryptedKeys);
        setCurrentPassphrase(passphrase);
        sessionStorage.setItem(SESSION_KEY, passphrase);
        if (persist) {
            localStorage.setItem(PERSIST_KEY, passphrase);
            setIsPersisted(true);
        }
        setStatus('unlocked');
    }, []);

    // Auto-restore: checks sessionStorage (tab session) then localStorage (persistent)
    useEffect(() => {
        const storedPassphrase = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(PERSIST_KEY);
        if (storedPassphrase && KeyVault.hasVault()) {
            const restoreId = window.setTimeout(() => {
                unlock(storedPassphrase).catch(() => {
                    sessionStorage.removeItem(SESSION_KEY);
                    localStorage.removeItem(PERSIST_KEY);
                    setIsPersisted(false);
                });
            }, 0);
            return () => window.clearTimeout(restoreId);
        }
    }, [unlock]);

    const setProviderSecret = useCallback(async (
        providerId: VaultProviderId,
        secret: string,
        passphrase?: string
    ) => {
        const effectivePassphrase = passphrase || currentPassphrase;

        if (!effectivePassphrase) {
            throw new Error('Passphrase required to encrypt secret.');
        }

        await KeyVault.upsertSecret(effectivePassphrase, providerId, secret);

        if (status === 'unlocked' || (passphrase && !currentPassphrase)) {
            const nextKeys = { ...keys, [providerId]: secret };
            setKeys(nextKeys);
            setRuntimeKeys(nextKeys);
            if (passphrase) setCurrentPassphrase(passphrase);
            setStatus('unlocked');
        }
    }, [currentPassphrase, status, keys]);

    return (
        <KeyringContext.Provider value={{
            status,
            keys,
            isPersisted,
            unlock,
            lock,
            forget,
            clearPersist,
            setProviderSecret,
            hasEncryptedKey: KeyVault.hasEncryptedKey
        }}>
            {children}
        </KeyringContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKeyring() {
    const context = useContext(KeyringContext);
    if (!context) {
        throw new Error('useKeyring must be used within a KeyringProvider');
    }
    return context;
}
