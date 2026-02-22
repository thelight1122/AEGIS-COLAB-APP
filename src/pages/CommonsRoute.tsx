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

export default function CommonsRoute() {
    return (
        <CommonsProvider>
            <CommonsRouter />
        </CommonsProvider>
    );
}
