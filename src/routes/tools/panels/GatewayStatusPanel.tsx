import { useState, useEffect, useCallback } from 'react';
import { ToolPanelShell } from '../../../features/tools/components/ToolPanelShell';
import { pingHealth } from '../../../features/tools/gateway/gatewayClient';
import type { HealthResponse } from '../../../features/tools/gateway/types';
import { Button } from '../../../components/ui/button';
import { Activity, RefreshCw, Copy, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function GatewayStatusPanel() {
    const [status, setStatus] = useState<HealthResponse | null>(null);
    const [isPinging, setIsPinging] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const checkHealth = useCallback(async () => {
        setIsPinging(true);
        const result = await pingHealth();
        setStatus(result);
        setLastChecked(new Date());
        setIsPinging(false);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const initCheck = async () => {
            if (isMounted) await checkHealth();
        };
        initCheck();
        const interval = setInterval(checkHealth, 20000); // Poll every 20s
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [checkHealth]);

    const copyDiagnostics = () => {
        const diagnostics = JSON.stringify({
            status,
            lastChecked,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        }, null, 2);
        navigator.clipboard.writeText(diagnostics);
    };

    return (
        <ToolPanelShell
            title="Gateway Status"
            badge="LIVE / DIAGNOSTIC"
            description="Connectivity and health monitoring for the Governed Tool Conduit. Ensures operational integrity between the frontend and the secure gateway."
        >
            <div className="space-y-8">
                {/* Status Indicator */}
                <div className="flex items-center justify-between p-6 rounded-xl bg-muted/20 border border-border">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-full transition-colors",
                            status?.ok ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        )}>
                            {status?.ok ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                        </div>
                        <div>
                            <div className="text-xl font-bold">
                                {status?.ok ? 'Connected' : 'Disconnected'}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkHealth}
                        disabled={isPinging}
                        className="gap-2"
                    >
                        <RefreshCw className={cn("w-4 h-4", isPinging && "animate-spin")} />
                        Retry
                    </Button>
                </div>

                {/* Details */}
                {status?.ok && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Active Providers
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {status.providers?.length ? (
                                status.providers.map(p => (
                                    <span key={p} className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium border border-border">
                                        {p}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground italic">No providers reported.</span>
                            )}
                        </div>
                    </div>
                )}

                {!status?.ok && lastChecked && (
                    <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-red-500 text-sm">
                        Unable to establish connection with the secure gateway. Please verify that the gateway service is running and accessible.
                    </div>
                )}

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                    <Button variant="ghost" size="sm" onClick={copyDiagnostics} className="text-muted-foreground hover:text-foreground gap-2">
                        <Copy className="w-4 h-4" />
                        Copy Diagnostics
                    </Button>
                </div>
            </div>
        </ToolPanelShell>
    );
}
