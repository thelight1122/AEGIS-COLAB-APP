/* eslint-disable */
import { useState, useEffect } from 'react';
import { getSkillsCatalog, installSkill, addCatalogSkill, editCatalogSkill, archiveCatalogSkill } from '../api/endpoints';
import { cn } from '../../../lib/utils';
import { Wrench, Check, Plus, Code, GitBranch, FileText, X, Edit, Archive, Upload } from 'lucide-react';

export interface CatalogSkill {
    id: string;
    name: string;
    description: string;
    category: string;
    icon?: string;
    skillMd: string;
}

interface SkillsCatalogProps {
    isOpen: boolean;
    onClose: () => void;
    installedSkills: any[];
    onInstallSuccess: () => void;
}

const ICON_MAP: Record<string, any> = {
    Code: Code,
    GitBranch: GitBranch,
    FileText: FileText,
};

export function SkillsCatalog({ isOpen, onClose, installedSkills, onInstallSuccess }: SkillsCatalogProps) {
    const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Management State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formAction, setFormAction] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<Partial<CatalogSkill>>({
        id: '', name: '', description: '', category: 'Development', icon: 'Code', skillMd: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchCatalog();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const fetchCatalog = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getSkillsCatalog();
            setCatalog(res.catalog || []);
        } catch (err: any) {
            setError(err.message || "Failed to load catalog");
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (skillId: string) => {
        setInstalling(skillId);
        try {
            await installSkill(skillId);
            onInstallSuccess(); // Refresh parents list
        } catch (err: any) {
            console.error("Install failed:", err);
        } finally {
            setInstalling(null);
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            id: '', name: '', description: '', category: 'Development', icon: 'Code',
            skillMd: `---\nname: \ndescription: \n---\n\n# \n\nInstructions...`
        });
        setFormAction('create');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (skill: CatalogSkill) => {
        setFormData({ ...skill });
        setFormAction('edit');
        setIsFormOpen(true);
    };

    const handleArchive = async (skillId: string) => {
        if (!confirm("Are you sure you want to archive this skill? It will be hidden from the catalog.")) return;
        setLoading(true);
        try {
            await archiveCatalogSkill(skillId);
            fetchCatalog();
        } catch (err: any) {
            setError(err.message || "Failed to archive skill");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.id || !formData.name) {
            alert("ID and Name are required");
            return;
        }
        setSubmitting(true);
        try {
            if (formAction === 'create') {
                await addCatalogSkill(formData);
            } else {
                await editCatalogSkill(formData.id!, formData);
            }
            setIsFormOpen(false);
            fetchCatalog();
        } catch (err: any) {
            alert(err.message || "Failed to save skill");
        } finally {
            setSubmitting(false);
        }
    };

    const handleImportJSON = () => {
        const json = prompt("Paste Skill JSON here:");
        if (!json) return;
        try {
            const parsed = JSON.parse(json);
            setFormData({
                id: parsed.id || '',
                name: parsed.name || '',
                description: parsed.description || '',
                category: parsed.category || 'Development',
                icon: parsed.icon || 'Code',
                skillMd: parsed.skillMd || ''
            });
            setFormAction('create');
            setIsFormOpen(true);
        } catch (e) {
            alert("Invalid JSON format");
        }
    };

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
              <div 
                 className="bg-neutral-dark border border-neutral-border rounded-xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]"
                 onClick={e => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-neutral-border/30 pb-3">
                      <div className="flex items-center gap-2">
                          <Wrench className="w-5 h-5 text-primary" />
                          <h2 className="text-lg font-bold">Skills Catalog</h2>
                      </div>
                      <div className="flex items-center gap-2">
                          {!isFormOpen && (
                               <>
                                   <button 
                                       onClick={handleImportJSON} 
                                       className="text-xs bg-background-dark/50 hover:bg-background-dark/80 text-white px-2.5 py-1 rounded-lg border border-neutral-border/30 flex items-center gap-1"
                                   >
                                       <Upload className="w-3.5 h-3.5" /> Import
                                   </button>
                                   <button 
                                       onClick={handleOpenCreate} 
                                       className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-2.5 py-1 rounded-lg border border-primary/30 flex items-center gap-1"
                                   >
                                       <Plus className="w-3.5 h-3.5" /> Add Skill
                                   </button>
                               </>
                          )}
                          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                      {isFormOpen ? (
                           <div className="space-y-4 p-1">
                               <h3 className="text-md font-bold text-white mb-2">{formAction === 'create' ? 'Create New Skill' : 'Edit Skill'}</h3>
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="space-y-1">
                                       <label className="text-xs text-muted-foreground">ID (unique, snake_case)</label>
                                       <input 
                                           type="text" 
                                           value={formData.id || ''} 
                                           disabled={formAction === 'edit'}
                                           onChange={e => setFormData({ ...formData, id: e.target.value })}
                                           className="w-full bg-background-dark/50 border border-neutral-border/30 rounded-lg px-3 py-1.5 text-sm"
                                       />
                                   </div>
                                   <div className="space-y-1">
                                       <label className="text-xs text-muted-foreground">Name</label>
                                       <input 
                                            type="text" 
                                            value={formData.name || ''} 
                                            onChange={e => {
                                                const name = e.target.value;
                                                const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                                                setFormData({ 
                                                    ...formData, 
                                                    name, 
                                                    id: formAction === 'create' ? slug : formData.id 
                                                });
                                            }}
                                            className="w-full bg-background-dark/50 border border-neutral-border/30 rounded-lg px-3 py-1.5 text-sm"
                                        />
                                   </div>
                               </div>
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="space-y-1">
                                       <label className="text-xs text-muted-foreground">Category</label>
                                       <select 
                                            value={formData.category || 'Development'} 
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-background-dark/50 border border-neutral-border/30 rounded-lg px-3 py-1.5 text-sm bg-neutral-dark"
                                        >
                                            <option value="Development">Development</option>
                                            <option value="Research">Research</option>
                                            <option value="Security">Security</option>
                                            <option value="Automation">Automation</option>
                                            <option value="Custom">Custom</option>
                                        </select>
                                   </div>
                                   <div className="space-y-1">
                                       <label className="text-xs text-muted-foreground">Icon (Code, GitBranch, FileText)</label>
                                       <select 
                                            value={formData.icon || 'Code'} 
                                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                            className="w-full bg-background-dark/50 border border-neutral-border/30 rounded-lg px-3 py-1.5 text-sm bg-neutral-dark"
                                        >
                                            {['Code', 'GitBranch', 'FileText'].map(key => (
                                                <option key={key} value={key}>{key}</option>
                                            ))}
                                        </select>
                                   </div>
                               </div>
                               <div className="space-y-1">
                                   <label className="text-xs text-muted-foreground">Description</label>
                                   <input 
                                       type="text" 
                                       value={formData.description || ''} 
                                       onChange={e => setFormData({ ...formData, description: e.target.value })}
                                       className="w-full bg-background-dark/50 border border-neutral-border/30 rounded-lg px-3 py-1.5 text-sm"
                                   />
                               </div>
                               <div className="space-y-1">
                                   <label className="text-xs text-muted-foreground">SKILL.md Content</label>
                                   <textarea 
                                       value={formData.skillMd || ''} 
                                       onChange={e => setFormData({ ...formData, skillMd: e.target.value })}
                                       rows={6}
                                       className="w-full bg-background-dark/50 border border-neutral-border/30 rounded-lg px-3 py-1.5 text-sm font-mono"
                                   />
                               </div>
                               <div className="flex gap-2 justify-end mt-4">
                                   <button 
                                       onClick={() => setIsFormOpen(false)} 
                                       className="px-3 py-1.5 bg-neutral-dark border border-neutral-border/40 rounded-lg text-xs"
                                   >
                                       Cancel
                                   </button>
                                   <button 
                                       onClick={handleSubmit} 
                                       disabled={submitting}
                                       className="px-3 py-1.5 bg-primary text-background-dark rounded-lg text-xs font-semibold flex items-center gap-1"
                                   >
                                       {submitting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-background-dark"></div> : 'Save'}
                                   </button>
                               </div>
                           </div>
                      ) : loading ? (
                           <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                      ) : error ? (
                           <div className="text-red-400 text-center p-4 bg-red-900/10 border border-red-500/20 rounded-xl">{error}</div>
                      ) : catalog.length === 0 ? (
                           <div className="text-muted-foreground text-center p-4">Catalog is empty</div>
                      ) : (
                           catalog.map(skill => {
                               const isInstalled = installedSkills.some((s: any) => s.id === skill.id);
                               const Icon = ICON_MAP[skill.icon || 'Code'] || Wrench;
                               return (
                                   <div key={skill.id} className="flex items-center justify-between p-4 rounded-xl bg-background-dark/50 border border-neutral-border/30 hover:border-neutral-border/60 hover:bg-background-dark/80 transition-all">
                                       <div className="flex items-center gap-3">
                                           <div className="p-2.5 rounded-lg bg-neutral-dark border border-neutral-border/40 text-primary">
                                               <Icon className="w-5 h-5" />
                                           </div>
                                           <div>
                                               <h3 className="text-sm font-semibold text-white">{skill.name}</h3>
                                               <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{skill.description}</p>
                                               <div className="flex gap-1.5 mt-1.5">
                                                   <span className="text-[10px] bg-neutral-dark px-1.5 py-0.5 rounded border border-neutral-border/30 text-muted-foreground">{skill.category}</span>
                                               </div>
                                           </div>
                                       </div>

                                       <div className="flex items-center gap-2">
                                            {/* Management Buttons */}
                                            <button 
                                                onClick={() => handleOpenEdit(skill)}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-background-dark transition-colors"
                                                title="Edit Skill"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleArchive(skill.id)}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-background-dark transition-colors"
                                                title="Archive Skill"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => !isInstalled && handleInstall(skill.id)}
                                                disabled={isInstalled || installing === skill.id}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all",
                                                    isInstalled 
                                                       ? "bg-green-900/30 text-green-400 border border-green-500/30 cursor-default"
                                                       : "bg-primary text-background-dark hover:bg-primary/90 shadow-sm shadow-primary/20"
                                                )}
                                            >
                                                {installing === skill.id ? (
                                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-background-dark"></div>
                                                ) : isInstalled ? (
                                                    <><Check className="w-3.5 h-3.5" /> Installed</>
                                                ) : (
                                                    <><Plus className="w-3.5 h-3.5" /> Install</>
                                                )}
                                            </button>
                                       </div>
                                   </div>
                               );
                           })
                      )}
                  </div>
              </div>
          </div>
     );
}
