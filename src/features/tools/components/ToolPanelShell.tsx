import type { ReactNode } from 'react';

interface ToolPanelShellProps {
    title: string;
    badge?: string;
    description?: string;
    children: ReactNode;
}

export function ToolPanelShell({ title, badge, description, children }: ToolPanelShellProps) {
    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                    {badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                            {badge}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-muted-foreground text-sm">
                        {description}
                    </p>
                )}
            </div>

            <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm p-6 overflow-auto">
                {children}
            </div>
        </div>
    );
}
