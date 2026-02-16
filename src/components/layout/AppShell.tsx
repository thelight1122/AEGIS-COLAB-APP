import { useEffect } from 'react';
import { loadSessions, saveSessions, applyAbandonment } from '../../core/sessions/sessionStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

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
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-6 relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
