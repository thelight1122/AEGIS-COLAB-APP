import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../core/supabase/client';
import { Loader2, AlertCircle, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Card, CardContent, Button } from '../components/ui';

export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // 1. Check for errors in URL fragment (hash) or search params
                // Supabase often puts errors in the hash: #error=access_denied&error_code=otp_expired
                const fragment = new URLSearchParams(window.location.hash.substring(1));
                const searchParams = new URLSearchParams(window.location.search);

                const err = fragment.get('error') || searchParams.get('error');
                const errCode = fragment.get('error_code') || searchParams.get('error_code');
                const errDesc = fragment.get('error_description') || searchParams.get('error_description');

                if (err || errCode) {
                    setErrorCode(errCode);
                    throw new Error(errDesc || err || 'Authentication failed');
                }

                // 2. Handle PKCE code exchange if present
                const code = searchParams.get('code');
                const next = searchParams.get('redirectTo') || fragment.get('redirectTo') || '/';

                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                } else {
                    // 3. Handle Hash tokens (implicit flow)
                    const accessToken = fragment.get('access_token');
                    const refreshToken = fragment.get('refresh_token');

                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        if (error) throw error;
                    } else {
                        // 4. Fallback: check if we already have a session 
                        // (Supabase client might have already parsed the hash fragment)
                        const { data: { session }, error } = await supabase.auth.getSession();
                        if (error) throw error;
                        if (!session) {
                            throw new Error('No active authorization session detected.');
                        }
                    }
                }

                setStatus('success');
                // Brief pause for user feedback before redirect
                setTimeout(() => navigate(next, { replace: true }), 1500);
            } catch (error: unknown) {
                console.error('Auth callback error:', error);
                setStatus('error');

                let message = 'Verification failed. The link may be expired.';
                if (error && typeof error === 'object') {
                    const errObj = error as Record<string, unknown>;
                    if (typeof errObj.message === 'string') {
                        message = errObj.message;
                    } else if (typeof errObj.error_description === 'string') {
                        message = errObj.error_description;
                    }
                }
                setErrorMessage(message);
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="w-full max-w-sm bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl overflow-hidden">
                <div className="h-1 bg-muted w-full overflow-hidden">
                    {status === 'loading' && <div className="h-full bg-primary animate-progress w-[40%]" />}
                    {status === 'success' && <div className="h-full bg-green-500 transition-all duration-500 w-full" />}
                    {status === 'error' && <div className="h-full bg-red-500 w-full" />}
                </div>

                <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
                    {status === 'loading' && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                <Loader2 className="w-12 h-12 text-primary animate-spin relative" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold uppercase tracking-[0.2em]">Authenticating</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Verifying secure handshake with <br /> AEGIS Identity Hub...
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold uppercase tracking-[0.1em] text-green-500">Identity Verified</h2>
                                <p className="text-sm text-muted-foreground">
                                    Access granted. Initializing environment...
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,44,44,0.2)]">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold uppercase tracking-[0.1em] text-red-500">Seal Failure</h2>
                                <div className="bg-red-500/5 border border-red-500/10 rounded p-3 mt-2">
                                    <p className="text-xs text-red-400 font-mono text-left break-words">
                                        {errorCode ? `CODE: ${errorCode}` : 'AUTH_ERROR'}
                                        <br />
                                        MSG: {errorMessage}
                                    </p>
                                </div>

                                {errorCode === 'otp_expired' ? (
                                    <p className="text-xs text-muted-foreground mt-4">
                                        This magic link has expired or has already been used.
                                        Please request a new link and <strong>use the most recent email link</strong> received.
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground mt-4">
                                        We encountered a problem during the verification process.
                                    </p>
                                )}
                            </div>

                            <div className="w-full grid grid-cols-1 gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/')}
                                    className="gap-2 text-[11px] uppercase tracking-widest font-bold"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Request New Link
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/')}
                                    className="gap-2 text-[10px] text-muted-foreground"
                                >
                                    <ArrowLeft className="w-3 h-3" />
                                    Return to Entry
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
