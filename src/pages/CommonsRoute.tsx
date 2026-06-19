import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CommonsProvider } from '../contexts/CommonsContext';
import { useCommons } from '../hooks/useCommons';
import { SessionInit } from '../components/commons/SessionInit';
import { WorkshopInterior } from '../components/commons/WorkshopInterior';
import { PublicHeader } from '../components/layout/PublicHeader';
import { CommonsEntryGate } from '../components/commons/CommonsEntryGate';
import { SessionPickerModal } from '../components/commons/SessionPickerModal';
import { ArchiveModal } from '../components/archive/ArchiveModal';
import { AuthPanel } from '../components/ui/AuthPanel';

function CommonsRouter() {
    const { isWorkshopActive, enterWorkshop } = useCommons();
    const [searchParams] = useSearchParams();
    const sid = searchParams.get('sessionId');

    const [view, setView] = useState<'gate' | 'init'>('gate');
    const [isSessionPickerOpen, setIsSessionPickerOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);

    useEffect(() => {
        if (sid && !isWorkshopActive) {
            enterWorkshop(sid);
        }
    }, [sid, isWorkshopActive, enterWorkshop]);

    if (isWorkshopActive) return <WorkshopInterior />;

    return (
        <div className="h-screen flex flex-col bg-[#111921] overflow-hidden">
            <PublicHeader />
            <main className="flex-1 overflow-y-auto">
                {view === 'gate' ? (
                    <CommonsEntryGate
                        onNewSession={() => setView('init')}
                        onResumeSession={() => setIsSessionPickerOpen(true)}
                        onOpenArchive={() => setIsArchiveOpen(true)}
                    />
                ) : (
                    <div className="relative">
                        <button
                            onClick={() => setView('gate')}
                            className="absolute top-6 left-6 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold transition-colors z-10"
                        >
                            ← Back to Lobby
                        </button>
                        <SessionInit />
                    </div>
                )}
            </main>

            <SessionPickerModal
                isOpen={isSessionPickerOpen}
                onClose={() => setIsSessionPickerOpen(false)}
                onSelectSession={(sessionId) => {
                    setIsSessionPickerOpen(false);
                    enterWorkshop(sessionId);
                }}
            />

            <ArchiveModal
                isOpen={isArchiveOpen}
                onClose={() => setIsArchiveOpen(false)}
                onResumeSession={(session) => {
                    setIsArchiveOpen(false);
                    enterWorkshop(session.id);
                }}
            />
        </div>
    );
}

import { useKeyring } from '../contexts/KeyringContext';

export default function CommonsRoute() {
    const { status } = useKeyring();
    const isUnlocked = status === 'unlocked';

    if (!isUnlocked) {
        return (
            <div className="min-h-full flex items-center justify-center bg-[#111921] text-white p-6">
                <div className="w-full max-w-4xl grid gap-6 md:grid-cols-[1fr_24rem] items-start">
                    <div className="space-y-4 bg-neutral-dark p-8 rounded-2xl border border-neutral-border/30 shadow-2xl">
                        <h2 className="text-xl font-bold text-primary">Identity Required</h2>
                        <p className="text-sm text-muted-foreground">
                            Sign in to restore account data, then unlock or configure the local vault to enter the Commons.
                        </p>
                        <button
                            onClick={() => window.location.href = '/settings'}
                            className="mt-2 px-4 py-2 bg-primary text-background-dark rounded-lg font-semibold shadow-sm hover:bg-primary/90 transition-all"
                        >
                            Configure Keys in Settings
                        </button>
                    </div>
                    <AuthPanel />
                </div>
            </div>
        );
    }

    return (
        <CommonsProvider>
            <CommonsRouter />
        </CommonsProvider>
    );
}
