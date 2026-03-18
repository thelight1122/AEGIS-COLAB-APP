import { useState } from 'react';
import { Play, Plus, Clock, Users, Briefcase, Terminal } from 'lucide-react';
import { createRun } from '../api/endpoints';
import type { BuildMasterInfo, Project, Team, Task, Run } from '../api/types';

interface AdvancedDashboardProps {
    bms: BuildMasterInfo[];
    projects: Project[];
    teams: Team[];
    tasks: Task[];
    runs: Run[];
    refresh: () => void;
}

export function AdvancedDashboard({ bms, projects, teams, tasks, runs, refresh }: AdvancedDashboardProps) {
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedTask, setSelectedTask] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateRun = async () => {
        if (!selectedProject || !selectedTeam) return;
        setLoading(true);
        try {
            await createRun({
                projectId: selectedProject,
                teamId: selectedTeam,
                taskId: selectedTask || undefined
            });
            refresh();
        } catch (err) {
            console.error("Failed to create Run:", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'failed': return 'text-red-400 bg-red-400/10 border-red-500/20';
            default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Run Dispatch Form (Advanced Quick Action) */}
            <div className="bg-neutral-dark border border-neutral-border rounded-xl p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-4 border-b border-neutral-border/50 pb-3">
                    <Terminal className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-semibold tracking-wider text-muted-foreground">DISPATCH SEQUENCE</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" /> Project
                        </label>
                        <select 
                            value={selectedProject} 
                            onChange={e => setSelectedProject(e.target.value)}
                            className="bg-background-dark border border-neutral-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.projectId} value={p.projectId}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> Team
                        </label>
                        <select 
                            value={selectedTeam} 
                            onChange={e => setSelectedTeam(e.target.value)}
                            className="bg-background-dark border border-neutral-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">Select Team</option>
                            {teams.map(t => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Task (Optional)
                        </label>
                        <select 
                            value={selectedTask} 
                            onChange={e => setSelectedTask(e.target.value)}
                            className="bg-background-dark border border-neutral-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">Ad-hoc Run</option>
                            {tasks.map(t => <option key={t.taskId} value={t.taskId}>{t.title}</option>)}
                        </select>
                    </div>

                    <button 
                        onClick={handleCreateRun}
                        disabled={loading || !selectedProject || !selectedTeam}
                        className="bg-primary hover:bg-primary/90 text-background-dark font-semibold px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed h-[38px]"
                    >
                        <Play className="w-4 h-4 fill-background-dark" />
                        Execute
                    </button>
                </div>
            </div>

            {/* Runs Management Table Grid */}
            <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground border-b border-neutral-border/30 pb-1.5 flex items-center gap-1">
                    <Terminal className="w-4 h-4" /> EXECUTION RUNS ({runs.length})
                </h3>

                <div className="bg-neutral-dark border border-neutral-border rounded-xl overflow-hidden shadow-lg">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-background-dark/50 text-xs text-muted-foreground uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Run ID</th>
                                <th className="px-4 py-3">Project</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Timestamp</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-border/40 text-sm">
                            {runs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-6 text-muted-foreground">No execution history found.</td>
                                </tr>
                            ) : runs.map(run => {
                                const proj = projects.find(p => p.projectId === run.projectId);
                                return (
                                    <tr key={run.runId} className="hover:bg-neutral-border/20 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-white/90">{run.runId.slice(0, 8)}...</td>
                                        <td className="px-4 py-3">{proj?.name || run.projectId.slice(0, 8)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(run.status)}`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(run.createdTs).toLocaleTimeString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-primary hover:text-primary/80 font-medium text-xs">Inspect</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
