"use client";
import { useState } from 'react';
import { Shield, Lock, Unlock, AlertCircle, ExternalLink } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useKeyring } from '../../contexts/KeyringContext';
import { useNavigate } from 'react-router-dom';

interface UnlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function UnlockModal({ isOpen, onClose, onSuccess }: UnlockModalProps) {
    const navigate = useNavigate();
    const { unlock } = useKeyring();
    const [passphrase, setPassphrase] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnlock = async () => {
        if (!passphrase) return;
        setIsLoading(true);
        setError(null);
        try {
            await unlock(passphrase);
            setPassphrase('');
            onSuccess?.();
            onClose();
        } catch {
            setError('Unlock failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Unlock Key Vault"
            className="max-w-md"
        >
            <div className="space-y-6 py-2">
                <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Vault is Locked</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                            Keys are stored encrypted on this device. Unlock is required to use them.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Master Passphrase</label>
                        <Input
                            type="password"
                            placeholder="Enter your passphrase..."
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                            autoFocus
                            className="bg-muted/30 h-12"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-xs text-destructive animate-in fade-in zoom-in-95">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={handleUnlock}
                            disabled={!passphrase || isLoading}
                            className="w-full gap-2 h-11 transition-all"
                        >
                            {isLoading ? 'Unlocking...' : (
                                <>
                                    <Unlock className="w-4 h-4" />
                                    Unlock Keys
                                </>
                            )}
                        </Button>
                        <div className="flex items-center justify-between px-1">
                            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
                                Cancel
                            </Button>
                            <Button
                                variant="link"
                                size="sm"
                                onClick={() => { onClose(); navigate('/settings'); }}
                                className="flex items-center gap-1.5 text-xs font-bold text-primary"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Manage Keys in Settings
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex gap-3 opacity-60">
                    <Shield className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-[10px] leading-relaxed italic text-muted-foreground">
                        Security: Decrypted keys live only in memory (Keyring). Closing the tab or clicking "Lock" clears them immediately. Not sent to our servers.
                    </p>
                </div>
            </div>
        </Dialog>
    );
}
