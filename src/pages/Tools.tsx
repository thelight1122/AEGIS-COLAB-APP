import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { Bot, Terminal } from 'lucide-react';

const AISimulator = lazy(() => import('../components/tools/AISimulator'));

// Dev tools container page
export default function Tools() {
    const isEnabled = import.meta.env.VITE_ENABLE_TOOLS === "true";

    if (!isEnabled) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <header className="border-b pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Terminal className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dev Tools</h1>
                        <p className="text-sm text-muted-foreground">Diagnostic instruments and simulators for AEGIS development.</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-6">
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-bold">AI Simulator (Offline / Mock Mode)</h2>
                        <span className="text-[10px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">Dev Tool</span>
                    </div>

                    <Suspense fallback={
                        <div className="p-12 border border-dashed rounded-lg text-center text-muted-foreground animate-pulse">
                            Loading Simulator Component...
                        </div>
                    }>
                        <AISimulator />
                    </Suspense>
                </section>
            </div>
        </div>
    );
}
