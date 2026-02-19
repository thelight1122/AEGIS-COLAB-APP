import { useSearchParams } from 'react-router-dom';
import { ToolList } from '../../features/tools/components/ToolList';
import SimulatorPanel from './panels/SimulatorPanel';
import GatewayStatusPanel from './panels/GatewayStatusPanel';
import { Wrench } from 'lucide-react';

export default function ToolsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeToolId = searchParams.get('tool');

    const handleSelectTool = (id: string) => {
        setSearchParams({ tool: id });
    };

    return (
        <div className="flex gap-8 h-[calc(100vh-8rem)]">
            {/* Left Column: Tool List */}
            <div className="w-80 flex-shrink-0">
                <ToolList activeToolId={activeToolId} onSelectTool={handleSelectTool} />
            </div>

            {/* Right Column: Rendering Panel */}
            <div className="flex-1 min-w-0">
                {activeToolId === 'simulator' && <SimulatorPanel />}
                {activeToolId === 'gateway' && <GatewayStatusPanel />}

                {!activeToolId && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10 border border-dashed border-border rounded-2xl gap-4">
                        <div className="p-6 rounded-full bg-muted/20">
                            <Wrench className="w-12 h-12 opacity-20" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground">Governance Workbench</h3>
                            <p className="max-w-xs mx-auto text-sm mt-1">
                                Choose a tool from the sidebar to inspect system health or simulate behavior sequences.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
