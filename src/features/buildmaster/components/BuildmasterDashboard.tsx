import { useState } from 'react';
import { useBuildmaster } from '../hooks/useBuildmaster';
import { NoviceDashboard } from './NoviceDashboard';
import { AdvancedDashboard } from './AdvancedDashboard';
import { AgentInspectModal } from './AgentInspectModal';
import { cn } from '../../../lib/utils';
import { Settings, Shield, Zap } from 'lucide-react';
import type { BuildMasterInfo } from '../api/types';

export default function BuildmasterDashboard() {
    const { bms, projects, teams, tasks, runs, tools, skills, loading, error, refresh } = useBuildmaster();
    const [mode, setMode] = useState<'novice' | 'engineer'>('novice');
    const [selectedBm, setSelectedBm] = useState<BuildMasterInfo | null>(null);

    return (
        <div className="flex flex-col h-full w-full bg-background-dark text-white overflow-hidden">
            {/* Top Navigation / Dashboard Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-border bg-neutral-dark/40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary animate-pulse" />
                    <h1 className="text-xl font-bold tracking-wider">BUILDMASTER <span className="text-primary">WORKSHOP</span></h1>
                </div>

                <div className="flex items-center gap-3 bg-background-dark border border-neutral-border rounded-lg p-1">
                    <button
                        onClick={() => setMode('novice')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            mode === 'novice' 
                                ? "bg-primary text-background-dark shadow-md"
                                : "text-muted-foreground hover:text-white"
                        )}
                    >
                        <Shield className="w-4 h-4" />
                        Novice
                    </button>
                    <button
                        onClick={() => setMode('engineer')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            mode === 'engineer' 
                                ? "bg-primary text-background-dark shadow-md"
                                : "text-muted-foreground hover:text-white"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        Engineer
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg">
                        Error: {error}
                    </div>
                ) : mode === 'novice' ? (
                    <NoviceDashboard 
                        bms={bms} 
                        projects={projects} 
                        tasks={tasks} 
                        availableTools={tools}
                        availableSkills={skills}
                        refresh={refresh} 
                        onInspectBm={setSelectedBm} 
                    />
                ) : (
                    <AdvancedDashboard 
                        bms={bms} 
                        projects={projects} 
                        teams={teams} 
                        tasks={tasks} 
                        runs={runs} 
                        refresh={refresh} 
                    />
                )}
            </div>

            {/* Global Inspect Modal */}
            <AgentInspectModal 
                isOpen={!!selectedBm} 
                onClose={() => setSelectedBm(null)} 
                bm={selectedBm} 
                availableTools={tools} 
                availableSkills={skills}
                refresh={refresh} 
            />
        </div>
    );
}

