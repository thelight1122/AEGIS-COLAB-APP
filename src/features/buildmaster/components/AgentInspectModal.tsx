import { useState, useEffect } from 'react';
import { X, Sliders, Terminal, Shield, Wrench } from 'lucide-react';
import { createBm } from '../api/endpoints';
import type { BuildMasterInfo, Tool, Skill } from '../api/types';

interface AgentInspectModalProps {
    isOpen: boolean;
    onClose: () => void;
    bm: BuildMasterInfo | null;
    availableTools: Tool[];
    availableSkills?: Skill[];
    refresh: () => void;
}

export function AgentInspectModal({ isOpen, onClose, bm, availableTools, availableSkills = [], refresh }: AgentInspectModalProps) {
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('engineering');
    const [customRole, setCustomRole] = useState('');
    const [prompt, setPrompt] = useState('');
    const [selectedTools, setSelectedTools] = useState<string[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [editWeights, setEditWeights] = useState({ cognitive: 50, affective: 50, operational: 50, relational: 50 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (bm) {
            setEditName(bm.displayName);
            
            const cog = bm.dataquad?.cognitive || {};
            const op = bm.dataquad?.operational || {};
            const aff = bm.dataquad?.affective || {};
            const rel = bm.dataquad?.relational || {};

            setPrompt(cog.prompt || 'You are a helpful AEGIS Buildmaster agent. Follow the Axiom Canon and reduce force metrics.');
            
            const savedRole = op.role || 'engineering';
            const isStandardRole = ['engineering', 'qa', 'product', 'mediator'].includes(savedRole);
            setEditRole(isStandardRole ? savedRole : 'custom');
            setCustomRole(isStandardRole ? '' : savedRole);
            
            setSelectedTools(op.tools || []);
            setSelectedSkills(op.skills || []);
            
            setEditWeights({
                cognitive: cog.weight ? cog.weight * 100 : 50,
                affective: aff.weight ? aff.weight * 100 : 50,
                operational: op.weight ? op.weight * 100 : 50,
                relational: rel.weight ? rel.weight * 100 : 50
            });
        }
    }, [bm]);

    const handleSaveEdit = async () => {
        if (!bm || !editName.trim()) return;
        setSaving(true);
        try {
            const finalRole = editRole === 'custom' ? customRole : editRole;
            await createBm({
                bmId: bm.bmId,
                displayName: editName,
                dataquad: {
                    cognitive: { weight: editWeights.cognitive / 100, prompt },
                    affective: { weight: editWeights.affective / 100 },
                    operational: { 
                        weight: editWeights.operational / 100, 
                        role: finalRole, 
                        tools: selectedTools,
                        skills: selectedSkills 
                    },
                    relational: { weight: editWeights.relational / 100 }
                }
            });
            onClose();
            refresh();
        } catch (err) {
            console.error("Failed to update BM:", err);
        } finally {
            setSaving(false);
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

    if (!isOpen || !bm) return null;

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#121820]/95 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/2">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-teal-400" />
                        <h3 className="text-sm font-semibold tracking-wider text-teal-400 uppercase">INSPECT BUILDMASTER</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 flex-grow overflow-y-auto space-y-5">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">Node ID</label>
                            <div className="bg-[#0c1015] text-slate-500 font-mono text-xs p-2.5 rounded-lg border border-white/5 truncate">
                                {bm.bmId}
                            </div>
                        </div>

                        <div className="md:col-span-1 flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">Agent Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="bg-[#0c1015] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                            />
                        </div>

                        <div className="md:col-span-1 flex flex-col gap-1.5">
                            <label className="text-xs text-slate-400 font-medium">Role Preset</label>
                            <select 
                                value={editRole}
                                onChange={e => setEditRole(e.target.value)}
                                className="bg-[#0c1015] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                            >
                                <option value="engineering">Engineer</option>
                                <option value="qa">Advisor</option>
                                <option value="product">Orchestrator</option>
                                <option value="mediator">Mediator</option>
                                <option value="custom">Custom...</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Role Input */}
                    {editRole === 'custom' && (
                        <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-xs text-slate-400 font-medium">Custom Role Title</label>
                            <input 
                                type="text" 
                                value={customRole}
                                onChange={e => setCustomRole(e.target.value)}
                                placeholder="Enter custom role..."
                                className="bg-[#0c1015] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/50 transition-all"
                            />
                        </div>
                    )}

                    {/* Prompt Editor */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5" /> Core Directives (System Prompt)
                        </label>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            rows={4}
                            className="bg-[#0c1015] border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-teal-500/50 resize-none transition-all"
                            placeholder="Define the agent's behavior and constraints..."
                        />
                    </div>

                    {/* Personality & Tools Split */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sliders */}
                        <div className="flex flex-col gap-3 bg-white/2 p-4 rounded-xl border border-white/5">
                            <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 border-b border-white/5 pb-2">
                                <Sliders className="w-3.5 h-3.5" /> Dimensions Weights
                            </span>
                            <div className="space-y-3 pt-1">
                                {Object.entries(editWeights).map(([key, value]) => (
                                    <div key={key} className="flex flex-col gap-1">
                                        <div className="flex justify-between text-xs capitalize">
                                            <span className="text-slate-300">{key}</span>
                                            <span className="text-teal-400 font-mono">{value}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={value}
                                            onChange={e => setEditWeights(w => ({ ...w, [key]: parseInt(e.target.value) }))}
                                            className="accent-teal-500 h-1 bg-[#0c1015] rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tools Checklist */}
                        <div className="flex flex-col gap-3 bg-white/2 p-4 rounded-xl border border-white/5">
                            <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 border-b border-white/5 pb-2">
                                <Wrench className="w-3.5 h-3.5" /> Capability Modules (Tools)
                            </span>
                            <div className="flex-grow overflow-y-auto max-h-[160px] space-y-1.5 pr-1 pt-1">
                                {availableTools.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-slate-500">No tools detected.</div>
                                ) : availableTools.map(tool => (
                                    <label key={tool.name} className="flex items-center justify-between p-2 rounded-lg bg-[#0c1015]/80 hover:bg-[#0c1015] border border-white/5 hover:border-white/10 cursor-pointer group transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-medium text-slate-200 group-hover:text-white">{tool.name}</span>
                                            <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{tool.description}</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTools.includes(tool.name)}
                                            onChange={() => toggleTool(tool.name)}
                                            className="accent-teal-500 w-3.5 h-3.5 rounded border-white/20 bg-white/5 focus:ring-0"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Specialist Capabilities (Skills) */}
                    <div className="flex flex-col gap-3 bg-white/2 p-4 rounded-xl border border-white/5">
                        <span className="text-xs font-semibold text-teal-400 flex items-center gap-1 border-b border-white/5 pb-2">
                            <Shield className="w-3.5 h-3.5" /> Specialist Capabilities (Skills)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            {availableSkills.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-500 md:col-span-2">No skills loaded.</div>
                            ) : availableSkills.map(skill => (
                                <label key={skill.id} className="flex items-center justify-between p-2 rounded-lg bg-[#0c1015]/80 hover:bg-[#0c1015] border border-white/5 hover:border-white/10 cursor-pointer group transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-200 group-hover:text-white">{skill.name || skill.id}</span>
                                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{skill.description}</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSkills.includes(skill.id)}
                                        onChange={() => toggleSkill(skill.id)}
                                        className="accent-teal-500 w-3.5 h-3.5 rounded border-white/20 bg-white/5 focus:ring-0"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/2 border-t border-white/5 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg text-sm text-slate-400 hover:text-white transition-all"
                    >
                        Close
                    </button>
                    <button 
                        onClick={handleSaveEdit}
                        disabled={saving || !editName.trim()}
                        className="bg-teal-500 hover:bg-teal-400 text-[#0c1015] font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-md shadow-teal-500/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving Specs...' : 'Update Artifact'}
                    </button>
                </div>
            </div>
        </div>
    );
}
