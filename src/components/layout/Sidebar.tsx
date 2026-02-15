
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Layers,
    History,
    Users,
    Eye,
    Settings,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useIDS } from '../../contexts/IDSContext';
import { IDSStream } from '../chamber/IDSStream';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const navItems = [
        { to: "/", icon: LayoutDashboard, label: "Chamber" },
        { to: "/artifacts", icon: Layers, label: "Artifacts" },
        { to: "/sessions", icon: History, label: "Sessions" },
        { to: "/peers", icon: Users, label: "Peers" },
        { to: "/lenses", icon: Eye, label: "Lenses" },
        { to: "/settings", icon: Settings, label: "Settings" },
    ];

    const { idsCards, canvasNodes, attachNode, removeAttachment, clearStream, setFocusNode } = useIDS();
    const location = useLocation();

    // Only show "Focus" functionality if we are in the Chamber
    const handleFocusNode = (nodeId: string) => {
        if (location.pathname === '/') {
            setFocusNode(nodeId);
        }
    };

    return (
        <aside className={cn("w-64 bg-card border-r border-border flex flex-col h-screen", className)}>
            <div className="h-14 flex items-center px-6 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                        A
                    </div>
                    <span className="font-semibold text-lg tracking-tight">AEGIS</span>
                </div>
            </div>

            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 border-t border-border">
                <div className="p-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shadow Stream</span>
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

            <div className="p-4 border-t border-border mt-auto flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                        U
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">User</span>
                        <span className="text-xs text-muted-foreground">Online</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
