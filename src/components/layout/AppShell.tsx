import { useEffect } from 'react';
import { loadSessions, saveSessions, applyAbandonment } from '../../core/sessions/sessionStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ConfigStatus } from '../ui/ConfigStatus';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    // Global Abandonment Timer (60s tick)
    useEffect(() => {
        const interval = setInterval(() => {
            const sessions = loadSessions();
            const inactivityMs = 300000; // 5 minutes inactivity limit
            const nextSessions = applyAbandonment(sessions, inactivityMs);
            if (nextSessions !== sessions) {
                saveSessions(nextSessions);
            }
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-background-dark text-white overflow-hidden font-display">
            <ConfigStatus />
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 relative overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
