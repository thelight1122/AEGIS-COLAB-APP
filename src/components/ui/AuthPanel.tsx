import { useState, useEffect } from 'react';
import { supabase } from '../../core/supabase/client';
import { useAuthSession } from '../../core/auth/useAuthSession';
import { Button } from './button';
import { Input } from './input';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { LogIn, LogOut, Mail, Loader2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const COOLDOWN_KEY = 'aegis_auth_cooldown';
const COOLDOWN_DURATION = 60; // seconds

export function AuthPanel() {
    const { session, user, loading: sessionLoading } = useAuthSession();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // Persist and resume cooldown on mount
    useEffect(() => {
        const storedExpiry = localStorage.getItem(COOLDOWN_KEY);
        if (storedExpiry) {
            const expiry = parseInt(storedExpiry, 10);
            const remaining = Math.ceil((expiry - Date.now()) / 1000);
            if (remaining > 0) {
                setCooldown(remaining);
            } else {
                localStorage.removeItem(COOLDOWN_KEY);
            }
        }
    }, []);

    // Cooldown timer logic
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        localStorage.removeItem(COOLDOWN_KEY);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const startCooldown = () => {
        const expiry = Date.now() + COOLDOWN_DURATION * 1000;
        localStorage.setItem(COOLDOWN_KEY, expiry.toString());
        setCooldown(COOLDOWN_DURATION);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || cooldown > 0) return;

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) {
                // Check if it's a rate limit error
                const isRateLimit = error.message.toLowerCase().includes('rate limit') || (error as { status?: number }).status === 429;

                if (isRateLimit) {
                    setMessage({
                        type: 'error',
                        text: 'Email sending is temporarily limited. Please wait a minute and use your newest email link.'
                    });
                } else {
                    setMessage({ type: 'error', text: error.message });
                }
                // Always trigger cooldown on attempt to prevent rapid retry behavior
                startCooldown();
            } else {
                setMessage({ type: 'success', text: 'Magic link sent! Check your email.' });
                setEmail('');
                startCooldown();
            }
        } catch {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
            startCooldown();
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (sessionLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking authentication...
            </div>
        );
    }

    if (session) {
        return (
            <div className="flex items-center gap-4 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium truncate max-w-[150px]">{user?.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="h-7 px-2 text-[10px] uppercase tracking-wider font-bold hover:text-destructive transition-colors">
                    <LogOut className="w-3 h-3 mr-1" />
                    Sign Out
                </Button>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-sm bg-card/50 backdrop-blur-sm border-primary/20 shadow-xl overflow-hidden">
            <CardHeader className="pb-3 text-center border-b border-border/10 bg-muted/5">
                <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <LogIn className="w-3.5 h-3.5 text-primary" />
                    Mission Authentication
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <form onSubmit={handleLogin} className="space-y-3">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            type="email"
                            placeholder="agent@aegis-facility.org"
                            className="pl-9 bg-muted/50 border-border/50 focus:border-primary/50 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading || cooldown > 0}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full font-bold uppercase tracking-widest text-xs h-10 transition-all active:scale-95"
                        disabled={loading || cooldown > 0}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : cooldown > 0 ? (
                            <Clock className="w-3.5 h-3.5 mr-2" />
                        ) : (
                            <Mail className="w-3.5 h-3.5 mr-2" />
                        )}
                        {cooldown > 0 ? `Retry in ${cooldown}s` : 'Send Magic Link'}
                    </Button>
                </form>

                {cooldown > 0 && (
                    <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-primary/5 border border-primary/10 rounded-full">
                        <span className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">
                            Active Cooldown
                        </span>
                        <div className="w-1 h-1 rounded-full bg-primary/40" />
                        <span className="text-[10px] text-muted-foreground font-medium">
                            Use the most recent email link.
                        </span>
                    </div>
                )}

                {message && (
                    <div className={`p-3 rounded-md text-[11px] font-medium flex gap-2 animate-in fade-in slide-in-from-top-1 border ${message.type === 'success'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{message.text}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
