import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CommonsProvider } from '../contexts/CommonsContext';
import { useCommons } from '../hooks/useCommons';
import { SessionInit } from '../components/commons/SessionInit';
import { WorkshopInterior } from '../components/commons/WorkshopInterior';
import { PublicHeader } from '../components/layout/PublicHeader';

function CommonsRouter() {
    const { isWorkshopActive, enterWorkshop } = useCommons();
    const [searchParams] = useSearchParams();
    const sid = searchParams.get('sessionId');

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
                <SessionInit />
            </main>
        </div>
    );
}

import { useKeyring } from '../contexts/KeyringContext';

export default function CommonsRoute() {
    const { status } = useKeyring();
    const isUnlocked = status === 'unlocked';

    if (!isUnlocked) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#111921] text-white p-6">
                <div className="text-center max-w-md space-y-4 bg-neutral-dark p-8 rounded-2xl border border-neutral-border/30 shadow-2xl">
                    <h2 className="text-xl font-bold text-primary">Identity Required</h2>
                    <p className="text-sm text-muted-foreground">The AEGIS Peer Commons is a sovereign workspace. You must unlock your local vault or configure keys to proceed.</p>
                    <button 
                        onClick={() => window.location.href = '/settings'} 
                        className="mt-2 px-4 py-2 bg-primary text-background-dark rounded-lg font-semibold shadow-sm hover:bg-primary/90 transition-all"
                    >
                        Configure Keys in Settings
                    </button>
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
