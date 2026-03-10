import { ToolPanelShell } from '../../../features/tools/components/ToolPanelShell';
import { Button } from '../../../components/ui/button';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function BuildmasterPanel() {
    const [key, setKey] = useState(0);

    return (
        <ToolPanelShell
            title="Buildmaster Agent Workshop"
            badge="LOCAL IDE"
            description="AEGIS Build Master Platform Kernel UI. Used to manage agents, projects, and autonomous tasks outside of the conversational Commons."
        >
            <div className="flex flex-col h-[calc(100vh-18rem)] space-y-4">
                <div className="flex justify-between items-center px-4 py-2 bg-muted/20 border border-border rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Connected to Local Buildmaster Kernel
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setKey(k => k + 1)} className="h-8 gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Reload Frame
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-2" asChild>
                            <a href="http://localhost:5174" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                                Open Externally
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 rounded-xl overflow-hidden border border-border min-h-0 bg-black">
                    <iframe
                        key={key}
                        src="http://localhost:5174/buildmasters"
                        className="w-full h-full border-0"
                        title="Buildmaster Agent UI"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                    />
                </div>
            </div>
        </ToolPanelShell>
    );
}
