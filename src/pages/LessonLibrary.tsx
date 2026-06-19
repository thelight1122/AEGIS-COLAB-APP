import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar, FileText, Trash2, Download, Zap, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { loadLessonPlans, deleteLessonPlan, exportLessonPlan } from '../core/lessons/lessonStore';
import type { LessonPlan } from '../core/lessons/types';

export function LessonLibrary() {
    const navigate = useNavigate();
    const [lessons, setLessons] = useState<LessonPlan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setLessons(loadLessonPlans());
    }, []);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this lesson plan from the library?')) {
            deleteLessonPlan(id);
            setLessons(loadLessonPlans());
        }
    };

    const handleExport = (id: string, title: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const raw = exportLessonPlan(id);
            const blob = new Blob([raw], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-lesson-plan.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed.');
        }
    };

    const handleStartChamber = (lesson: LessonPlan) => {
        // Start a chamber session using the lesson plan ID
        navigate(`/chamber?lessonPlanId=${lesson.id}`);
    };

    const toggleExpand = (id: string) => {
        setExpandedLessons(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filteredLessons = lessons.filter(l => 
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.intent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatDate = (isoStr: string) => {
        return new Date(isoStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 pb-24">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-primary" /> Lesson Library
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Review, share, and launch structured, multi-pass calibration lessons.</p>
                </div>
                <Button onClick={() => navigate('/lessons/new')} className="bg-[#197fe6] hover:bg-[#197fe6]/90 text-white font-bold gap-2">
                    <Plus className="w-4 h-4" />
                    Create Lesson Plan
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="bg-[#16202a] border border-slate-800 rounded-2xl p-4 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search lesson plans by title, intent, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#111921] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Lesson Cards */}
            {filteredLessons.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-[#16202a]/30 text-slate-500 space-y-3">
                    <BookOpen className="w-12 h-12 mx-auto opacity-20" />
                    <p className="text-sm font-medium">No lesson plans stored in the library yet.</p>
                    <Button onClick={() => navigate('/lessons/new')} variant="link" className="text-primary font-bold">
                        Build one now
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLessons.map(lesson => {
                        const isExpanded = !!expandedLessons[lesson.id];
                        return (
                            <div 
                                key={lesson.id} 
                                className="bg-[#16202a] border border-slate-800 hover:border-slate-750 rounded-2xl transition-all overflow-hidden"
                            >
                                {/* Summary Card Head */}
                                <div 
                                    onClick={() => toggleExpand(lesson.id)}
                                    className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer"
                                >
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
                                            <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                                                {lesson.steps.length} Steps
                                            </span>
                                            <span className="text-[10px] font-bold bg-[#197fe6]/10 text-[#197fe6] border border-[#197fe6]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                Substrate: {lesson.substrateHandle}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                                            {lesson.intent}
                                        </p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {lesson.tags.map((t, idx) => (
                                                <span key={idx} className="text-[9px] font-bold text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full bg-slate-900/30">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStartChamber(lesson); }}
                                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                                        >
                                            <Zap className="w-3.5 h-3.5" />
                                            Launch Scaffold
                                        </button>
                                        <button
                                            onClick={(e) => handleExport(lesson.id, lesson.title, e)}
                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                                            title="Export plan JSON"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(lesson.id, e)}
                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 transition-colors"
                                            title="Delete Lesson Plan"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className="text-slate-400 p-1 pl-2 border-l border-slate-800">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Steps Details */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800 bg-[#121b24] p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-850">
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pedagogical Intent</h4>
                                                <p className="text-xs text-slate-300 leading-relaxed">{lesson.intent}</p>
                                            </div>
                                            {lesson.outcome && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Targeted Outcome</h4>
                                                    <p className="text-xs text-slate-300 leading-relaxed">{lesson.outcome}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> Lesson Steps Scaffolding
                                            </h4>
                                            
                                            <div className="space-y-3">
                                                {lesson.steps.map((step, idx) => (
                                                    <div 
                                                        key={step.stepId} 
                                                        className="bg-[#17212b] border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start justify-between gap-4"
                                                    >
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border border-indigo-500/20 shrink-0">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-xs font-mono font-bold text-slate-300">{step.authorHandle}</span>
                                                                <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded capitalize">
                                                                    {step.stepType}
                                                                </span>
                                                                <span className="text-[9px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded capitalize">
                                                                    Phase: {step.formationPhase}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-300 bg-[#0f161d] p-3 rounded-lg border border-slate-900 leading-relaxed font-mono">
                                                                {step.content}
                                                            </p>
                                                            {step.annotation && (
                                                                <div className="text-xs text-slate-400 italic bg-slate-900/40 p-2 rounded-lg border border-slate-850/60 pl-3">
                                                                    <strong>Annotation:</strong> {step.annotation}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
}

export default LessonLibrary;
