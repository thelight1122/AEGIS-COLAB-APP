"use client";
import React, { useState } from 'react';
import {
    Bot, Key, CheckCircle2,
    AlertCircle, Lock, Unlock, Trash2, Shield
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useKeyring } from '../contexts/KeyringContext';
import { cn } from '../lib/utils';
import { type VaultProviderId } from '../core/security/keyVault';

export default function Settings() {
    const {
        status,
        keys,
        unlock,
        lock,
        forget,
        setProviderSecret
    } = useKeyring();

    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);

    // Form states for individual keys (if unlocked)
    const [localKeys, setLocalKeys] = useState<Record<string, string>>({});

    const handleUnlock = async () => {
        setError(null);
        try {
            await unlock(passphrase);
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
            await unlock(passphrase);
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

    const isLocked = status === 'locked';
    const isEmpty = status === 'empty';
    const isUnlocked = status === 'unlocked';

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
            </section>

            {/* AI Configuration Section */}
            <section className={cn(
                "bg-card border border-border rounded-xl p-6 shadow-sm transition-opacity duration-300",
                !isUnlocked && "opacity-50 pointer-events-none grayscale-[0.5]"
            )}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Bot className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground">Provider Integration</h3>
                </div>

                {!isUnlocked && (
                    <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg text-sm text-center italic text-muted-foreground">
                        Unlock or setup your vault above to manage API keys.
                    </div>
                )}

                <div className="space-y-6">
                    {[
                        { id: 'gemini', label: 'Gemini', note: 'Required for Google models.' },
                        { id: 'openai', label: 'OpenAI', note: 'Required for GPT-4 and compatible OAI endpoints.' },
                        { id: 'anthropic', label: 'Anthropic', note: 'Required for Claude models.' },
                        { id: 'grok', label: 'Grok / xAI', note: 'Required for Grok models.' },
                        { id: 'lmstudio', label: 'LM Studio / Generic', note: 'Local or custom OpenAi-compatible endpoint.' }
                    ].map((provider) => (
                        <div key={provider.id} className="space-y-2">
                            <label className="text-sm font-medium flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Key className="w-4 h-4 opacity-70" />
                                    {provider.label} API Key
                                </span>
                                {keys[provider.id] && (
                                    <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold bg-green-500/10 px-1.5 py-0.5 rounded">
                                        <CheckCircle2 className="w-3 h-3" />
                                        STORED & ENCRYPTED
                                    </span>
                                )}
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    placeholder={keys[provider.id] ? "••••••••••••••••" : `Enter your ${provider.label} API key`}
                                    value={localKeys[provider.id] || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalKeys({ ...localKeys, [provider.id]: e.target.value })}
                                    className="bg-muted/30 focus-visible:ring-primary flex-1"
                                />
                                <Button
                                    size="sm"
                                    disabled={!localKeys[provider.id]}
                                    onClick={() => {
                                        handleSaveKey(provider.id as VaultProviderId, localKeys[provider.id]);
                                        setLocalKeys({ ...localKeys, [provider.id]: '' });
                                    }}
                                >
                                    Apply
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {provider.note}
                            </p>
                        </div>
                    ))}
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
                        Keys are stored encrypted on this device. They are not sent to our servers.
                        Unlock is required to use them. For security, we do not support "remember passphrase"
                        functionality—decrypted keys vanish when the browser is closed or the page is refreshed.
                    </p>
                </div>
            </div>
        </div>
    );
}
