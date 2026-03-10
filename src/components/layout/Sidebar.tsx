import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthSession } from '../../core/auth/useAuthSession';
import { supabase } from '../../core/supabase/client';
import { isToolsEnabled } from '../../features/tools/env';

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const navItems = [
        { to: "/chamber", icon: "dashboard", label: "Chamber" },
        { to: "/artifacts", icon: "database", label: "Artifacts" },
        { to: "/sessions", icon: "schedule", label: "Sessions" },
        { to: "/peers", icon: "groups", label: "Peers" },
        { to: "/lenses", icon: "visibility", label: "Lenses" },
    ];

    if (isToolsEnabled()) {
        navItems.push({ to: "/tools", icon: "terminal", label: "Tools" });
    }
    
    navItems.push({ to: "/settings", icon: "settings", label: "Settings" });

    const { session, user } = useAuthSession();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <aside className={cn("w-16 lg:w-64 border-r border-white/10 bg-background-dark/50 flex flex-col shrink-0", className)}>
            {/* Navigation */}
            <nav className="p-2 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 transition-all rounded group",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )
                        }
                    >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span className="text-sm font-medium hidden lg:block tracking-tight">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto border-t border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest hidden lg:block">Active Peers</span>
                    <span className="material-symbols-outlined text-white/40 text-sm">groups</span>
                </div>
                
                <div className="space-y-3">
                    {/* Canon Guardian (Demo) */}
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
                                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-background-dark rounded-full"></div>
                        </div>
                        <div className="hidden lg:block overflow-hidden">
                            <p className="text-xs font-bold text-white leading-none truncate">Canon Guardian</p>
                            <p className="text-[10px] text-primary/70">AI Lens • Active</p>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 group cursor-pointer pt-2">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {user?.email ? (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {user.email[0].toUpperCase()}
                                    </div>
                                ) : (
                                    <span className="material-symbols-outlined text-white/40">person</span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-background-dark rounded-full"></div>
                        </div>
                        <div className="hidden lg:block overflow-hidden flex-1">
                            <p className="text-xs font-bold text-white leading-none truncate">{user?.email?.split('@')[0] || 'Guest'}</p>
                            <p className="text-[10px] text-white/40 truncate">{session ? 'Online' : 'Offline'}</p>
                        </div>
                        {session && (
                            <button 
                                onClick={handleLogout}
                                className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-white/40 hover:text-destructive text-sm">logout</span>
                            </button>
                        )}
                    </div>
                </div>

                <button className="mt-6 w-full py-2 border border-dashed border-white/20 rounded hover:border-primary/50 transition-colors flex items-center justify-center gap-2 group overflow-hidden">
                    <span className="material-symbols-outlined text-sm text-white/40 group-hover:text-primary shrink-0">person_add</span>
                    <span className="text-[10px] font-bold text-white/40 group-hover:text-primary hidden lg:block uppercase truncate">Invite by Relevance</span>
                </button>
            </div>
        </aside>
    );
}
