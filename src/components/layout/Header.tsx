"use client";
import { cn } from '../../lib/utils';
import { AuthStatus } from '../ui';
import { useKeyring } from '../../contexts/KeyringContext';
import { useCoherencePercent } from '../../hooks/useCoherencePercent';

interface HeaderProps {
    className?: string;
    title?: string;
}

export function Header({ className }: HeaderProps) {
    const { status } = useKeyring();
    const isUnlocked = status === 'unlocked';
    const coherencePercent = useCoherencePercent() || 82; // Default for demo if null

    return (
        <header className={cn("h-14 border-b border-white/10 glass-panel flex items-center justify-between px-6 sticky top-0 z-50 shrink-0", className)}>
            <div className="flex items-center gap-4">
                <div className="text-primary">
                    <span className="material-symbols-outlined text-3xl">hub</span>
                </div>
                <div>
                    <h2 className="text-sm font-bold tracking-tight uppercase leading-none">System Core Protocol</h2>
                    <p className="text-[10px] text-primary/70 font-mono uppercase">AEGIS COHERENCE CHAMBER</p>
                </div>
            </div>

            <div className="flex-1 max-w-xl px-12">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-primary whitespace-nowrap tabular-nums">COHERENCE {coherencePercent}%</span>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary shadow-[0_0_10px_#13ecda] transition-all duration-1000 ease-in-out" 
                            style={{ width: `${coherencePercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    {isUnlocked && (
                        <span className="material-symbols-outlined text-green-500 text-sm" title="Vault Unlocked">shield_check</span>
                    )}
                    <span className="text-[10px] font-mono text-white/40">v0.8-alpha</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <AuthStatus />
                </div>
            </div>
        </header>
    );
}
