import { useState } from 'react';
import { useAuthSession } from '../../core/auth/useAuthSession';
import { Button } from './button';
import { Dialog } from './dialog';
import { AuthPanel } from './AuthPanel';
import { LogIn, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AuthStatus() {
    const { session, user, loading } = useAuthSession();
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

    if (loading) {
        return (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse border border-border" />
        );
    }

    if (session) {
        return (
            <div className="flex items-center gap-3 bg-muted/30 pl-1 pr-3 py-1 rounded-full border border-border/50 group hover:bg-muted/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80 leading-tight">Agent Verified</span>
                    <span className="text-[11px] font-medium text-foreground/90 truncate max-w-[120px]">
                        {user?.email?.split('@')[0]}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuthDialogOpen(true)}
                className={cn(
                    "h-8 gap-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all",
                    "text-[11px] uppercase tracking-wider font-bold"
                )}
            >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
            </Button>

            <Dialog
                isOpen={isAuthDialogOpen}
                onClose={() => setIsAuthDialogOpen(false)}
                title="Mission Authorization"
                className="max-w-md bg-transparent border-none shadow-none"
            >
                <div className="flex justify-center py-4">
                    <AuthPanel />
                </div>
            </Dialog>
        </>
    );
}
