"use client";
import React, { useState } from 'react';
import {
    Bot, Key, CheckCircle2,
    AlertCircle, Lock, Unlock, Trash2, Shield, RotateCcw,
    Download, Upload, Globe, Cpu, Save
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useKeyring } from '../contexts/KeyringContext';
import { useArchive } from '../contexts/ArchiveContext';
import { cn } from '../lib/utils';
import { type VaultProviderId } from '../core/security/keyVault';
import type { ModelProvider } from '../types/commons';
import {
    loadRuntimeInterfaceProfiles,
    saveRuntimeInterfaceProfiles,
    type RuntimeInterfaceProfile
} from '../core/providers/runtimeInterfaceProfiles';

type RuntimeOption = {
    id: VaultProviderId;
    label: string;
    note: string;
};

const HOSTED_RUNTIME_OPTIONS: RuntimeOption[] = [
    { id: 'openai', label: 'OpenAI', note: 'Hosted GPT runtime models.' },
    { id: 'gemini', label: 'Gemini', note: 'Hosted Google runtime models.' },
    { id: 'anthropic', label: 'Anthropic', note: 'Hosted Claude runtime models.' },
    { id: 'xai', label: 'Grok / xAI', note: 'Hosted Grok runtime models.' },
];

const LOCAL_RUNTIME_OPTIONS: RuntimeOption[] = [
    { id: 'lmstudio', label: 'LM Studio', note: 'Local OpenAI-compatible substrate interface.' },
    { id: 'ollama', label: 'Ollama', note: 'Local Ollama substrate interface.' },
];

export default function Settings() {
    const {
        status,
        keys,
        isPersisted,
        unlock,
        lock,
        forget,
        clearPersist,
        setProviderSecret
    } = useKeyring();

    const {
        status: archiveStatus,
        unlockArchive,
        lockArchive,
        setupArchive,
        exportVault,
        importVault
    } = useArchive();

    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [rememberOnDevice, setRememberOnDevice] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);

    // Archive Vault Setup states
    const [archivePassphrase, setArchivePassphrase] = useState('');
    const [confirmArchivePassphrase, setConfirmArchivePassphrase] = useState('');
    const [archiveError, setArchiveError] = useState<string | null>(null);

    // Form states for individual keys (if unlocked)
    const [localKeys, setLocalKeys] = useState<Record<string, string>>({});
    const [runtimeProfiles, setRuntimeProfiles] = useState<Record<ModelProvider, RuntimeInterfaceProfile>>(
        () => loadRuntimeInterfaceProfiles()
    );

    const handleUnlock = async () => {
        setError(null);
        try {
            await unlock(passphrase, rememberOnDevice);
            setPassphrase('');
        } catch {
            setError('Unlock failed.');
        }
    };

    const handleSetupVault = async () => {
        setError(null);
        if (!passphrase) {
            setError('Passphrase is required.');
            return;
        }
        if (passphrase !== confirmPassphrase) {
            setError('Passphrases do not match.');
            return;
        }

        try {
            await unlock(passphrase, rememberOnDevice);
        } catch {
            setError('Setup failed.');
        }
    };

    const handleSaveKey = async (providerId: VaultProviderId, secret: string) => {
        if (!secret) return;
        try {
            await setProviderSecret(providerId, secret);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch {
            setError('Failed to save encrypted key.');
        }
    };

    const updateRuntimeProfile = (
        providerId: ModelProvider,
        patch: Partial<RuntimeInterfaceProfile>
    ) => {
        setRuntimeProfiles(prev => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                ...patch,
                provider: providerId,
            },
        }));
    };

    const handleSaveRuntimeProfile = async (providerId: VaultProviderId) => {
        saveRuntimeInterfaceProfiles(runtimeProfiles);

        const pendingKey = localKeys[providerId];
        if (pendingKey) {
            await handleSaveKey(providerId, pendingKey);
            setLocalKeys(prev => ({ ...prev, [providerId]: '' }));
        } else {
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        }
    };

    const handleUnlockArchive = async () => {
        setArchiveError(null);
        try {
            const ok = await unlockArchive(archivePassphrase);
            if (ok) {
                setArchivePassphrase('');
            } else {
                setArchiveError('Unlock failed. Please check passcode.');
            }
        } catch (err) {
            setArchiveError('Unlock failed.');
        }
    };

    const handleSetupArchive = async () => {
        setArchiveError(null);
        if (!archivePassphrase) {
            setArchiveError('Passcode is required.');
            return;
        }
        if (archivePassphrase !== confirmArchivePassphrase) {
            setArchiveError('Passcodes do not match.');
            return;
        }
        try {
            await setupArchive(archivePassphrase);
            setArchivePassphrase('');
            setConfirmArchivePassphrase('');
        } catch (err) {
            setArchiveError('Setup failed.');
        }
    };

    const handleImportArchive = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setArchiveError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const count = await importVault(file);
            alert(`Successfully imported ${count} entries into the Archive.`);
        } catch (err) {
            setArchiveError(err instanceof Error ? err.message : 'Import failed.');
        }
    };

    const isLocked = status === 'locked';
    const isEmpty = status === 'empty';
    const isUnlocked = status === 'unlocked';

    return (
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground mt-2">
                    Configure global application preferences and secure AI integrations.
                </p>
            </div>

            {/* Vault Control Section */}
            <section className={cn(
                "border rounded-xl p-6 shadow-sm transition-all duration-300",
                isLocked ? "bg-amber-500/5 border-amber-500/20" :
                    isUnlocked ? "bg-green-500/5 border-green-500/20" :
                        "bg-card border-border"
            )}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "p-2 rounded-lg",
                            isLocked ? "bg-amber-500/10 text-amber-600" :
                                isUnlocked ? "bg-green-500/10 text-green-600" :
                                    "bg-primary/10 text-primary"
                        )}>
                            {isLocked ? <Lock className="w-5 h-5" /> :
                                isUnlocked ? <Unlock className="w-5 h-5" /> :
                                    <Shield className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold capitalize">Key Vault: {status}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                {isLocked && "Your keys are stored encrypted on this device. Enter passphrase to use them."}
                                {isUnlocked && "Vault is active. Decrypted keys are held in temporary memory."}
                                {isEmpty && "Protect your API keys with a local encryption passphrase."}
                            </p>
                        </div>
                    </div>

                    {isUnlocked && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={lock} className="gap-2">
                                <Lock className="w-4 h-4" />
                                Lock
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { if (confirm('Forget all keys on this device?')) forget(); }}
                                className="gap-2 text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" />
                                Forget
                            </Button>
                        </div>
                    )}
                </div>

                {isEmpty && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passphrase</label>
                                <Input
                                    type="password"
                                    placeholder="Keep it memorable"
                                    value={passphrase}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm</label>
                                <Input
                                    type="password"
                                    placeholder="Repeat passphrase"
                                    value={confirmPassphrase}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassphrase(e.target.value)}
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="rounded border-border w-4 h-4 accent-primary"
                                checked={rememberOnDevice}
                                onChange={e => setRememberOnDevice(e.target.checked)}
                            />
                            <span className="text-sm text-muted-foreground">Remember on this device — auto-unlock when the app opens</span>
                        </label>
                        <Button className="w-full gap-2" onClick={handleSetupVault}>
                            <Shield className="w-4 h-4" />
                            Enable Encrypted Vault
                        </Button>
                    </div>
                )}

                {isLocked && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Enter passphrase to unlock..."
                                value={passphrase}
                                autoFocus
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleUnlock()}
                            />
                            <Button onClick={handleUnlock} className="gap-2">
                                <Unlock className="w-4 h-4" />
                                Unlock
                            </Button>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="rounded border-border w-4 h-4 accent-primary"
                                checked={rememberOnDevice}
                                onChange={e => setRememberOnDevice(e.target.checked)}
                            />
                            <span className="text-sm text-muted-foreground">Remember on this device — auto-unlock when the app opens</span>
                        </label>
                    </div>
                )}

                {isUnlocked && isPersisted && (
                    <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                        <span className="text-primary font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Auto-unlock active on this device
                        </span>
                        <Button variant="ghost" size="sm" onClick={clearPersist} className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Disable
                        </Button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </section>

            {/* Archive Vault Control Section */}
            <section className={cn(
                "border rounded-xl p-6 shadow-sm transition-all duration-300 bg-card border-border",
                archiveStatus === 'locked' ? "bg-amber-500/5 border-amber-500/20" :
                    archiveStatus === 'unlocked' ? "bg-green-500/5 border-green-500/20" :
                        ""
            )}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "p-2 rounded-lg",
                            archiveStatus === 'locked' ? "bg-amber-500/10 text-amber-600" :
                                archiveStatus === 'unlocked' ? "bg-green-500/10 text-green-600" :
                                    "bg-primary/10 text-primary"
                        )}>
                            {archiveStatus === 'locked' ? <Lock className="w-5 h-5" /> :
                                archiveStatus === 'unlocked' ? <Unlock className="w-5 h-5" /> :
                                    <Shield className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold capitalize">Archive Vault: {archiveStatus}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                {archiveStatus === 'locked' && "Your session archives are secured. Enter passcode to decrypt and access."}
                                {archiveStatus === 'unlocked' && "Archive is unlocked. You can import/export or view secured histories."}
                                {archiveStatus === 'empty' && "Protect your local session archives with an independent passcode."}
                            </p>
                        </div>
                    </div>

                    {archiveStatus === 'unlocked' && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={lockArchive} className="gap-2">
                                <Lock className="w-4 h-4" />
                                Lock
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportVault} className="gap-2">
                                <Download className="w-4 h-4" />
                                Export
                            </Button>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".aegis"
                                    onChange={handleImportArchive}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Import archive"
                                    aria-label="Import archive"
                                />
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Upload className="w-4 h-4" />
                                    Import
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {archiveStatus === 'empty' && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passcode</label>
                                <Input
                                    type="password"
                                    placeholder="Enter archive passcode"
                                    value={archivePassphrase}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchivePassphrase(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm</label>
                                <Input
                                    type="password"
                                    placeholder="Repeat passcode"
                                    value={confirmArchivePassphrase}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmArchivePassphrase(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button className="w-full gap-2" onClick={handleSetupArchive}>
                            <Shield className="w-4 h-4" />
                            Enable Archive Vault
                        </Button>
                    </div>
                )}

                {archiveStatus === 'locked' && (
                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Enter passcode to unlock archive..."
                                value={archivePassphrase}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchivePassphrase(e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleUnlockArchive()}
                              autoFocus
                            />
                            <Button onClick={handleUnlockArchive} className="gap-2">
                                <Unlock className="w-4 h-4" />
                                Unlock
                            </Button>
                        </div>
                    </div>
                )}

                {archiveError && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        {archiveError}
                    </div>
                )}
            </section>

            {/* AI Configuration Section */}
            <section className={cn(
                "bg-card border border-border rounded-xl p-6 shadow-sm transition-opacity duration-300",
                !isUnlocked && "opacity-50 pointer-events-none grayscale-[0.5]"
            )}>
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-card-foreground">Runtime Interface Access</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Configure hosted APIs and local substrate access paths for live production lessons.
                            </p>
                        </div>
                    </div>
                </div>

                {!isUnlocked && (
                    <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg text-sm text-center italic text-muted-foreground">
                        Unlock or setup your vault above to manage conduit access keys.
                    </div>
                )}

                <div className="space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Hosted Runtime Interfaces</h4>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {HOSTED_RUNTIME_OPTIONS.map((provider) => (
                                <div key={provider.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                                    <label className="text-sm font-medium flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-2">
                                            <Key className="w-4 h-4 opacity-70" />
                                            {provider.label} Access Key
                                        </span>
                                        {keys[provider.id] && (
                                            <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-500/10 px-1.5 py-0.5 rounded">
                                                <CheckCircle2 className="w-3 h-3" />
                                                STORED
                                            </span>
                                        )}
                                    </label>
                                    <Input
                                        type="password"
                                        aria-label={`${provider.label} Access Key`}
                                        placeholder={keys[provider.id] ? "••••••••••••••••" : `Enter your ${provider.label} access key`}
                                        value={localKeys[provider.id] || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalKeys({ ...localKeys, [provider.id]: e.target.value })}
                                        className="bg-background/60 focus-visible:ring-primary"
                                    />
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runtime Model</label>
                                        <Input
                                            type="text"
                                            aria-label={`${provider.label} Runtime Model`}
                                            value={runtimeProfiles[provider.id].model}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRuntimeProfile(provider.id, { model: e.target.value })}
                                            className="bg-background/60 focus-visible:ring-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-[11px] text-muted-foreground">{provider.note}</p>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveRuntimeProfile(provider.id)}
                                            disabled={!localKeys[provider.id] && runtimeProfiles[provider.id].model.trim().length === 0}
                                            className="gap-2 shrink-0"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Cpu className="w-4 h-4 text-muted-foreground" />
                            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Local Substrate Runtime Interfaces</h4>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {LOCAL_RUNTIME_OPTIONS.map((provider) => (
                                <div key={provider.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h5 className="text-sm font-semibold">{provider.label}</h5>
                                            <p className="text-[11px] text-muted-foreground mt-1">{provider.note}</p>
                                        </div>
                                        {keys[provider.id] && (
                                            <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-500/10 px-1.5 py-0.5 rounded">
                                                <CheckCircle2 className="w-3 h-3" />
                                                KEY STORED
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Path URL</label>
                                        <Input
                                            type="text"
                                            aria-label={`${provider.label} Access Path URL`}
                                            value={runtimeProfiles[provider.id].endpoint ?? ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRuntimeProfile(provider.id, { endpoint: e.target.value })}
                                            className="bg-background/60 focus-visible:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Runtime Model</label>
                                        <Input
                                            type="text"
                                            aria-label={`${provider.label} Runtime Model`}
                                            placeholder={provider.id === 'lmstudio' ? 'e.g. local-model-name' : 'e.g. llama3'}
                                            value={runtimeProfiles[provider.id].model}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRuntimeProfile(provider.id, { model: e.target.value })}
                                            className="bg-background/60 focus-visible:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Access Key Optional</label>
                                        <Input
                                            type="password"
                                            aria-label={`${provider.label} Access Key Optional`}
                                            placeholder={keys[provider.id] ? "Using encrypted vault key" : "Optional local auth key"}
                                            value={localKeys[provider.id] || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalKeys({ ...localKeys, [provider.id]: e.target.value })}
                                            className="bg-background/60 focus-visible:ring-primary"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleSaveRuntimeProfile(provider.id)}
                                        disabled={!runtimeProfiles[provider.id].endpoint?.trim()}
                                        className="gap-2"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        Save Substrate Profile
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Success Label */}
            {isSaved && (
                <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Key Updated & Encrypted
                </div>
            )}

            {/* Important Note */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-semibold text-primary">Privacy-First Architecture</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        Keys are stored AES-GCM encrypted on this device and never sent to any server.
                        "Remember on this device" stores your passphrase in browser localStorage so the vault
                        auto-unlocks when you open the app. Disable it any time from the vault panel above.
                        Use "Forget" to wipe all keys and the stored passphrase completely.
                    </p>
                </div>
            </div>
        </div>
    );
}
