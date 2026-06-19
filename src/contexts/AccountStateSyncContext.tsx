import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuthSession } from '../core/auth/useAuthSession';
import {
    type AccountStateSyncSnapshot,
    getAccountStateSyncSnapshot,
    startAccountStateSync,
    subscribeAccountStateSync,
} from '../core/persistence/accountStateSync';

const AccountStateSyncContext = createContext<AccountStateSyncSnapshot>(getAccountStateSyncSnapshot());

export function AccountStateSyncProvider({ children }: { children: ReactNode }) {
    const { session } = useAuthSession();
    const [snapshot, setSnapshot] = useState<AccountStateSyncSnapshot>(getAccountStateSyncSnapshot());

    useEffect(() => subscribeAccountStateSync(setSnapshot), []);

    useEffect(() => {
        if (!session) return undefined;
        return startAccountStateSync(session);
    }, [session]);

    return (
        <AccountStateSyncContext.Provider value={snapshot}>
            {children}
        </AccountStateSyncContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccountStateSync() {
    return useContext(AccountStateSyncContext);
}
