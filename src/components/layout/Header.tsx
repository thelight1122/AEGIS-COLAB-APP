"use client";
import { cn } from '../../lib/utils';
import { AuthStatus } from '../ui';
import { useKeyring } from '../../contexts/KeyringContext';
import { Button } from '../ui/button';
import { Lock, ShieldCheck } from 'lucide-react';

interface HeaderProps {
    className?: string;
    title?: string;
}

export function Header({ className, title = "AEGIS Coherence Chamber" }: HeaderProps) {
    const { status, lock } = useKeyring();
    const isUnlocked = status === 'unlocked';

    return (
        <header className={cn("h-14 border-b border-border bg-card flex items-center px-6 justify-between", className)}>
            <div className="flex items-center gap-4">
                <h1 className="font-semibold text-lg">{title}</h1>

                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        v0.1.0-alpha
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium border border-green-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Online
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {isUnlocked && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-[10px] font-bold text-green-600 uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Vault Active
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={lock}
                            className="h-8 px-3 gap-2 text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/20"
                            title="Clear decrypted keys from memory"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            Lock Keys
                        </Button>
                        <div className="h-4 w-px bg-border mx-1" />
                    </div>
                )}

                {/* Placeholder for Coverage Bar */}
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500 w-[40%]" />
                    <div className="h-full bg-purple-500 w-[30%]" />
                    <div className="h-full bg-transparent w-[30%]" />
                </div>
                <span className="text-xs text-muted-foreground">70% Coherence</span>
                <div className="h-4 w-px bg-border mx-1" />
                <AuthStatus />
            </div>
        </header>
    );
}
