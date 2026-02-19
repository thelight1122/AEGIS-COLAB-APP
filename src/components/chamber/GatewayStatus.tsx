import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Server } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export function GatewayStatus() {
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [lastCheck, setLastCheck] = useState<string | null>(null);

    const checkHealth = useCallback(async () => {
        setStatus('checking');
        try {
            const resp = await fetch('/api/health');
            if (resp.ok) {
                const data = await resp.json();
                if (data.ok) {
                    setStatus('connected');
                    setLastCheck(new Date().toLocaleTimeString());
                    return;
                }
            }
            setStatus('disconnected');
        } catch {
            setStatus('disconnected');
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(checkHealth, 0);
        const interval = setInterval(checkHealth, 30000); // Poll every 30s
        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [checkHealth]);

    const [localFallback, setLocalFallback] = useState(() => localStorage.getItem('aegis_local_fallback') === 'true');

    useEffect(() => {
        localStorage.setItem('aegis_local_fallback', String(localFallback));
    }, [localFallback]);

    return (
        <div className="flex items-center gap-4 px-3 py-1.5 bg-background/50 backdrop-blur-sm border border-border rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gateway</span>
                </div>

                <div className="flex items-center gap-2 min-w-[80px]">
                    {status === 'checking' ? (
                        <div className="flex items-center gap-1.5 antialiased">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-medium text-yellow-600">Checking...</span>
                        </div>
                    ) : status === 'connected' ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="text-[10px] font-medium text-green-600">Online</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-[10px] font-medium text-red-600">Offline</span>
                        </div>
                    )}
                </div>

                {lastCheck && status === 'connected' && (
                    <span className="text-[9px] text-muted-foreground font-mono hidden xl:inline">
                        at {lastCheck}
                    </span>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    onClick={checkHealth}
                    title="Retry connection"
                    disabled={status === 'checking'}
                >
                    <RefreshCw className={cn("w-3 h-3", status === 'checking' && "animate-spin")} />
                </Button>
            </div>

            <div className="h-4 w-[1px] bg-border" />

            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                        checked={localFallback}
                        onChange={(e) => setLocalFallback(e.target.checked)}
                    />
                    <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Local Fallback (LM Studio)</span>
                </label>
            </div>
        </div>
    );
}
