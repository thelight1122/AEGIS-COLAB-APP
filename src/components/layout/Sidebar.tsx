
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Layers,
    History,
    Users,
    Eye,
    Settings,
    MoreHorizontal,
    LogOut,
    User as UserIcon,
    Shield
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useIDS } from '../../contexts/IDSContext';
import { IDSStream } from '../chamber/IDSStream';
import { useLocation } from 'react-router-dom';
import { useAuthSession } from '../../core/auth/useAuthSession';
import { supabase } from '../../core/supabase/client';

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const navItems = [
        { to: "/", icon: LayoutDashboard, label: "Chamber" },
        { to: "/artifacts", icon: Layers, label: "Artifacts" },
        { to: "/sessions", icon: History, label: "Sessions" },
        { to: "/peers", icon: Users, label: "Team Setup" },
        { to: "/lenses", icon: Eye, label: "Lenses" },
        { to: "/board", icon: Users, label: "Shared Board" },
        { to: "/settings", icon: Settings, label: "Settings" },
    ];

    const { idsCards, canvasNodes, attachNode, removeAttachment, clearStream, setFocusNode } = useIDS();
    const { session, user } = useAuthSession();
    const location = useLocation();

    const handleFocusNode = (nodeId: string) => {
        if (location.pathname === '/') {
            setFocusNode(nodeId);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <aside className={cn("w-64 bg-card border-r border-border flex flex-col h-screen", className)}>
            <div className="h-14 flex items-center px-6 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-lg shadow-primary/20">
                        A
                    </div>
                    <span className="font-semibold text-lg tracking-tight uppercase tracking-[0.2em] font-mono">AEGIS</span>
                </div>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                                isActive
                                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )
                        }
                    >
                        <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110")} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="flex-2 overflow-hidden flex flex-col min-h-0 border-t border-border">
                <div className="p-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-primary/60" />
                        Shadow Stream
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-muted"
                        onClick={clearStream}
                        title="Clear Stream"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <IDSStream
                        layout="vertical"
                        cards={idsCards}
                        nodes={canvasNodes}
                        onAttach={attachNode}
                        onRemoveAttachment={removeAttachment}
                        onFocusNode={handleFocusNode}
                        onClearStream={clearStream}
                        showComposer={false}
                        showHeader={false}
                    />
                </div>
            </div>

            <div className="p-4 border-t border-border mt-auto flex-shrink-0 bg-muted/10">
                {session ? (
                    <div className="flex items-center justify-between bg-card border border-border/50 rounded-lg p-3 group shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold truncate tracking-tight">{user?.email?.split('@')[0]}</span>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Verified Agent</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-dashed border-border group">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                            <Shield className="w-4 h-4 opacity-50" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Guest Mode</span>
                            <span className="text-[9px] text-muted-foreground/60 leading-tight">Limited Access Only</span>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
