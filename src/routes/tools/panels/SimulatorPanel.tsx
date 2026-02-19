import { ToolPanelShell } from '../../../features/tools/components/ToolPanelShell';
import AISimulator from '../../../components/tools/AISimulator';

export default function SimulatorPanel() {
    return (
        <ToolPanelShell
            title="AI Simulator"
            badge="OFFLINE / MOCK MODE"
            description="Run-time simulation of AI peer behaviors. Validates governance plumbing and UI responsiveness without external LLM dependencies."
        >
            <div className="space-y-6">
                <div className="bg-muted/30 border border-border p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                        <strong>Calm note:</strong> This tool operates in a fully isolated mock mode.
                        It does not call live LLM providers or incur token costs. All responses are
                        generated using local behavioral templates.
                    </p>
                </div>

                <AISimulator />
            </div>
        </ToolPanelShell>
    );
}
