/* eslint-disable */
import { useState } from 'react';
import { Settings, Play, Plus, Sliders, Terminal, Wrench } from 'lucide-react';
import { createBm } from '../api/endpoints';
import type { BuildMasterInfo, Project, Task, Tool, Skill } from '../api/types';
import { SkillsCatalog } from './SkillsCatalog';

interface NoviceDashboardProps {
    bms: BuildMasterInfo[];
    projects: Project[];
    tasks: Task[];
    availableTools: Tool[];
    availableSkills?: Skill[];
    refresh: () => void;
    onInspectBm: (bm: BuildMasterInfo) => void;
}

export function NoviceDashboard({ bms, projects, tasks, availableTools = [], availableSkills = [], refresh, onInspectBm }: NoviceDashboardProps) {
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('engineering');
    const [prompt, setPrompt] = useState('You are a helpful AEGIS Buildmaster agent. Follow the Axiom Canon.');
    const [selectedTools, setSelectedTools] = useState<string[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [weights, setWeights] = useState({ cognitive: 50, affective: 50, operational: 50, relational: 50 });
    const [loading, setLoading] = useState(false);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await createBm({
                displayName: name,
                dataquad: {
                    cognitive: { weight: weights.cognitive / 100, prompt },
                    affective: { weight: weights.affective / 100 },
                    operational: { weight: weights.operational / 100, role: domain, tools: selectedTools, skills: selectedSkills },
                    relational: { weight: weights.relational / 100 }
                }
            });
            setName('');
            setPrompt('You are a helpful AEGIS Buildmaster agent. Follow the Axiom Canon.');
            setSelectedTools([]);
            setSelectedSkills([]);
            refresh();
        } catch (err) {
            console.error("Failed to create BM:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleTool = (toolName: string) => {
        setSelectedTools(prev => 
            prev.includes(toolName) 
                ? prev.filter(t => t !== toolName) 
                : [...prev, toolName]
        );
    };

    const toggleSkill = (skillId: string) => {
        setSelectedSkills(prev => 
            prev.includes(skillId) 
                ? prev.filter(s => s !== skillId) 
                : [...prev, skillId]
        );
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Quick Create Card */}
            <div className="bg-neutral-dark border border-neutral-border rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Forge a New Agent</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Config Column */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm text-muted-foreground">Agent Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Nexus Protocol"
                                className="bg-background-dark border border-neutral-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm text-muted-foreground">Archetype</label>
                            <select 
                                value={domain}
                                onChange={e => setDomain(e.target.value)}
                                className="bg-background-dark border border-neutral-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary transition-all"
                            >
                                <option value="engineering">Engineer</option>
                                <option value="product">Advisor</option>
                                <option value="qa">Orchestrator</option>
                                <option value="mediator">Mediator</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm text-muted-foreground flex items-center gap-1">
                                <Terminal className="w-3.5 h-3.5" /> Core Directives
                            </label>
                            <textarea 
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                rows={3}
                                className="bg-background-dark border border-neutral-border rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-primary resize-none transition-all"
                                placeholder="Define the agent's behavior and constraints..."
                            />
                        </div>
                    </div>

                    {/* Personality Weights */}
                    <div className="flex flex-col gap-4 bg-background-dark/50 p-4 rounded-xl border border-neutral-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 border-b border-neutral-border/30 pb-2">
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Personality Weights</span>
                        </div>
                        <div className="space-y-3 pt-1">
                            {Object.entries(weights).map(([key, value]) => (
                                <div key={key} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs capitalize">
                                        <span className="text-white/80">{key}</span>
                                        <span className="text-primary font-mono">{value}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={value}
                                        onChange={e => setWeights(w => ({ ...w, [key]: parseInt(e.target.value) }))}
                                        className="accent-primary h-1 bg-neutral-border rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Capability Modules & Skills */}
                    <div className="flex flex-col gap-3 bg-background-dark/50 p-4 rounded-xl border border-neutral-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-b border-neutral-border/30 pb-2">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Tools & Capability Modules</span>
                        </div>
                        <div className="flex-grow overflow-y-auto max-h-[120px] space-y-1.5 pr-1">
                            {availableTools.length === 0 ? (
                                <div className="text-center py-4 text-xs text-muted-foreground">No tools available</div>
                            ) : availableTools.map(tool => (
                                <label key={tool.name} className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-dark hover:bg-neutral-dark/80 border border-neutral-border/30 cursor-pointer group transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-white group-hover:text-primary">{tool.name}</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTools.includes(tool.name)}
                                        onChange={() => toggleTool(tool.name)}
                                        className="accent-primary w-3.5 h-3.5 rounded border-neutral-border bg-background-dark focus:ring-0"
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="flex items-center justify-between border-b border-neutral-border/30 pb-2 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Settings className="w-3.5 h-3.5" />
                                <span>Specialist Capabilities (Skills)</span>
                            </div>
                            <button 
                                onClick={() => setIsCatalogOpen(true)}
                                type="button"
                                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                            >
                                <Plus className="w-2.5 h-2.5" /> Catalog
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto max-h-[120px] space-y-1.5 pr-1">
                            {availableSkills.length === 0 ? (
                                <div className="text-center py-4 text-xs text-muted-foreground">No skills loaded</div>
                            ) : availableSkills.map(skill => (
                                <label key={skill.id} className="flex items-center justify-between p-1.5 rounded-lg bg-neutral-dark hover:bg-neutral-dark/80 border border-neutral-border/30 cursor-pointer group transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-white group-hover:text-primary">{skill.name || skill.id}</span>
                                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{skill.description}</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSkills.includes(skill.id)}
                                        onChange={() => toggleSkill(skill.id)}
                                        className="accent-primary w-3.5 h-3.5 rounded border-neutral-border bg-background-dark focus:ring-0"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button 
                        onClick={handleCreate}
                        disabled={loading || !name}
                        className="bg-primary hover:bg-primary/90 text-background-dark font-medium px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-primary/20"
                    >
                        {loading ? 'Forging...' : 'Equip Agent'}
                    </button>
                </div>
            </div>

            {/* Active Agents Fleet */}
            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Settings className="w-4 h-4" /> ACTIVE FLEET ({bms.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bms.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-muted-foreground text-sm border border-neutral-border border-dashed rounded-lg">
                            No agents deployed. Create one above to begin.
                        </div>
                    ) : bms.map(bm => (
                        <div 
                            key={bm.bmId} 
                            onClick={() => onInspectBm(bm)}
                            className="bg-neutral-dark border border-neutral-border rounded-xl p-5 hover:border-primary/40 cursor-pointer transition-all flex justify-between items-center group shadow-sm hover:shadow-primary/5"
                        >
                            <div>
                                <h4 className="font-medium text-white group-hover:text-primary transition-colors">{bm.displayName}</h4>
                                <span className="text-xs text-muted-foreground font-mono">ID: {bm.bmId.slice(0,8)}...</span>
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); /* Play trigger placeholder */ }} 
                                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-background-dark transition-all shadow-inner group-hover:scale-105"
                            >
                                <Play className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Skills Catalog Modal */}
            <SkillsCatalog 
                isOpen={isCatalogOpen} 
                onClose={() => setIsCatalogOpen(false)} 
                installedSkills={availableSkills} 
                onInstallSuccess={refresh} 
            />
        </div>
    );
}
