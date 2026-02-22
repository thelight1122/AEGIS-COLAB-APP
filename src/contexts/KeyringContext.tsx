"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import * as KeyVault from '../core/security/keyVault';
import { type VaultProviderId } from '../core/security/keyVault';
import { setRuntimeKeys, clearRuntimeKeys } from '../core/security/keyringStore';

export type KeyringStatus = 'locked' | 'unlocked' | 'empty';

interface KeyringContextType {
    status: KeyringStatus;
    keys: Record<string, string>;
    unlock: (passphrase: string) => Promise<void>;
    lock: () => void;
    forget: () => void;
    setProviderSecret: (providerId: VaultProviderId, secret: string, passphrase?: string) => Promise<void>;
}

const KeyringContext = createContext<KeyringContextType | undefined>(undefined);

export function KeyringProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<KeyringStatus>(() => {
        // Safe initialization to avoid effect cascading if possible
        if (typeof window !== 'undefined' && KeyVault.hasVault()) return 'locked';
        return 'empty';
    });
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [currentPassphrase, setCurrentPassphrase] = useState<string | null>(null);

    // Migration/Cleanup of legacy plaintext keys
    useEffect(() => {
        const LEGACY_KEYS = ['aegis-system-settings', 'aegis_keys'];
        let foundLegacy = false;

        LEGACY_KEYS.forEach(k => {
            if (localStorage.getItem(k) || sessionStorage.getItem(k)) {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
                foundLegacy = true;
            }
        });

        if (foundLegacy) {
            console.warn('AEGIS: Legacy plaintext keys detected and purged for security. Please re-enter keys in Settings to use the encrypted vault.');
        }
    }, []);



    const lock = useCallback(() => {
        setKeys({});
        setCurrentPassphrase(null);
        clearRuntimeKeys();
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
        setStatus('empty');
    }, []);

    const unlock = useCallback(async (passphrase: string) => {
        const decryptedKeys = await KeyVault.unlockAll(passphrase);
        setKeys(decryptedKeys);
        setRuntimeKeys(decryptedKeys);
        setCurrentPassphrase(passphrase);
        setStatus('unlocked');
    }, []);

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
            unlock,
            lock,
            forget,
            setProviderSecret
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
