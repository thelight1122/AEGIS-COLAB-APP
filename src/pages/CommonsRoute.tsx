import { CommonsProvider } from '../contexts/CommonsContext';
import { useCommons } from '../hooks/useCommons';
import { SessionInit } from '../components/commons/SessionInit';
import { WorkshopInterior } from '../components/commons/WorkshopInterior';

function CommonsRouter() {
    const { isWorkshopActive } = useCommons();

    return isWorkshopActive ? <WorkshopInterior /> : <SessionInit />;
}

export default function CommonsRoute() {
    return (
        <CommonsProvider>
            <CommonsRouter />
        </CommonsProvider>
    );
}
