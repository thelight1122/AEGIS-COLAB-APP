import { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { isToolsEnabled } from '../features/tools/env';

const ToolsPage = lazy(() => import('./tools/ToolsPage'));

/**
 * Gated route for the Tools feature.
 * Redirects to home if tools are disabled.
 */
export function ToolsRoute() {
    if (!isToolsEnabled()) {
        console.warn('Access denied: Tools feature is disabled via environment flags.');
        return <Navigate to="/" replace />;
    }

    return (
        <Suspense fallback={
            <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse font-medium">
                        Loading Governance Workbench...
                    </p>
                </div>
            </div>
        }>
            <ToolsPage />
        </Suspense>
    );
}
