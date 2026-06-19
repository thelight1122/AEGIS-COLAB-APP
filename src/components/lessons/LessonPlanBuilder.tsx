import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, ArrowLeft, Calendar, FileText, CheckCircle2, ChevronRight, Tag } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { loadSessions } from '../../core/sessions/sessionStore';
import { saveLessonPlan } from '../../core/lessons/lessonStore';
import type { Session } from '../../core/sessions/types';
import type { LessonPlan, LessonStep } from '../../core/lessons/types';

type StepDetail = {
    annotation: string;
    formationPhase: 'orienting' | 'exploring' | 'integrating' | 'releasing';
    stepType: 'attractor' | 'calibration' | 'response' | 'breakthrough' | 'anchor';
};

type ManualStepDraft = StepDetail & {
    id: string;
    authorHandle: string;
    content: string;
};

export function LessonPlanBuilder() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    // Metadata form states
    const [title, setTitle] = useState('');
    const [intent, setIntent] = useState('');
    const [outcome, setOutcome] = useState('');
    const [substrateHandle, setSubstrateHandle] = useState('');
    const [headmasterHandle, setHeadmasterHandle] = useState('');
    const [tagsInput, setTagsInput] = useState('');

    // Steps selection and configuration state
    const [selectedEvents, setSelectedEvents] = useState<Record<string, boolean>>({});
    const [stepDetails, setStepDetails] = useState<Record<string, StepDetail>>({});
    const [manualStepDrafts, setManualStepDrafts] = useState<ManualStepDraft[]>([createManualStepDraft()]);

    useEffect(() => {
        const loaded = loadSessions();
        setSessions(loaded);
        if (loaded.length > 0) {
            setSelectedSessionId(loaded[0].id);
        }
    }, []);

    useEffect(() => {
        if (selectedSessionId) {
            const found = sessions.find(s => s.id === selectedSessionId) || null;
            setSelectedSession(found);
            setSelectedEvents({});
            setStepDetails({});
        } else {
            setSelectedSession(null);
        }
    }, [selectedSessionId, sessions]);

    const handleToggleEvent = (eventId: string, defaultContent: string, defaultAuthor: string) => {
        setSelectedEvents(prev => {
            const next = { ...prev, [eventId]: !prev[eventId] };
            if (next[eventId] && !stepDetails[eventId]) {
                setStepDetails(d => ({
                    ...d,
                    [eventId]: {
                        annotation: '',
                        formationPhase: 'exploring',
                        stepType: 'attractor',
                    }
                }));
            }
            return next;
        });
    };

    const handleStepDetailChange = (eventId: string, field: string, value: string) => {
        setStepDetails(prev => ({
            ...prev,
            [eventId]: {
                ...prev[eventId],
                [field]: value
            }
        }));
    };

    const handleManualStepChange = (id: string, field: keyof ManualStepDraft, value: string) => {
        setManualStepDrafts(prev => prev.map(step => (
            step.id === id ? { ...step, [field]: value } : step
        )));
    };

    const handleAddManualStep = () => {
        setManualStepDrafts(prev => [...prev, createManualStepDraft()]);
    };

    const handleRemoveManualStep = (id: string) => {
        setManualStepDrafts(prev => {
            const next = prev.filter(step => step.id !== id);
            return next.length > 0 ? next : [createManualStepDraft()];
        });
    };

    const handleSave = () => {
        if (!title || !intent || !substrateHandle) {
            alert('Title, Formation Intent, and Substrate Handle are required.');
            return;
        }

        const selectedSteps: LessonStep[] = selectedSession
            ? selectedSession.eventLog
                .filter((e, idx) => {
                    const eventId = `${e.timestamp}-${idx}`;
                    return selectedEvents[eventId];
                })
                .map((e, idx) => {
                    const eventId = `${e.timestamp}-${idx}`;
                    const detail = stepDetails[eventId];
                    const content = e.type === 'AI_CHAT_COMPLETED' ? e.responseText
                        : e.type === 'CONTRIBUTION' ? e.contentSummary
                        : e.type === 'AI_CHAT_REQUESTED' ? e.prompt
                        : '';

                    const author = 'peerId' in e ? String(e.peerId) : substrateHandle.trim() || '@host';

                    return {
                        stepId: `step-${crypto.randomUUID()}`,
                        sourceEventId: eventId,
                        authorHandle: author,
                        classification: author.startsWith('@') ? 'substrate' : 'biopeer',
                        content: content || '',
                        annotation: detail.annotation,
                        formationPhase: detail.formationPhase,
                        stepType: detail.stepType,
                    };
                })
            : [];

        const manualSteps: LessonStep[] = manualStepDrafts
            .filter(step => step.content.trim())
            .map(step => ({
                stepId: `step-${crypto.randomUUID()}`,
                sourceEventId: `manual-${step.id}`,
                authorHandle: step.authorHandle.trim() || substrateHandle.trim() || '@host',
                classification: 'biopeer',
                content: step.content.trim(),
                annotation: step.annotation.trim(),
                formationPhase: step.formationPhase,
                stepType: step.stepType,
            }));

        const lessonSteps = [...selectedSteps, ...manualSteps];

        if (lessonSteps.length === 0) {
            alert('Please author at least one step, or select events from a session.');
            return;
        }

        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

        const newPlan: LessonPlan = {
            id: `LP-${crypto.randomUUID()}`,
            title,
            sourceSessionId: selectedSession?.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            intent,
            substrateHandle,
            headmasterHandle,
            steps: lessonSteps,
            outcome,
            tags,
            status: 'published'
        };

        saveLessonPlan(newPlan);
        alert('Lesson Plan successfully built and saved to library!');
        navigate('/lessons');
    };

    return (
        <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 pb-24">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/lessons')} className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors" title="Back to Lesson Library" aria-label="Back to Lesson Library">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white">Lesson Plan Builder</h1>
                        <p className="text-xs text-slate-400 mt-1">Distill active calibration logs into repeatable pedagogical scaffolds.</p>
                    </div>
                </div>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/95 text-background-dark font-bold gap-2">
                    <Save className="w-4 h-4" />
                    Publish Lesson Plan
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Side: Metadata and Session Selection */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#16202a] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Lesson Metadata
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source Calibration Session</label>
                            <select
                                value={selectedSessionId}
                                onChange={(e) => setSelectedSessionId(e.target.value)}
                                className="w-full bg-[#111921] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                                title="Source Calibration Session"
                                aria-label="Source Calibration Session"
                            >
                                <option value="">-- None (manual steps only) --</option>
                                {sessions.map(s => {
                                    const date = s.startedAt
                                        ? new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                        : 'Draft';
                                    const label = `${date} · ${s.status} · ${s.eventLog.length} event${s.eventLog.length !== 1 ? 's' : ''}${s.hostHandle ? ` · ${s.hostHandle}` : ''}`;
                                    return (
                                        <option key={s.id} value={s.id}>{label}</option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lesson Title</label>
                            <Input
                                placeholder="e.g. Substrate Equilibrium Alignment"
                                value={title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                                className="bg-[#111921] border-slate-800"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Formation Intent</label>
                            <textarea
                                placeholder="State the pedagogical target or equilibrium goal..."
                                value={intent}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIntent(e.target.value)}
                                className="w-full bg-[#111921] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none h-24 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Substrate (Learner)</label>
                                <Input
                                    placeholder="e.g. @alder"
                                    value={substrateHandle}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubstrateHandle(e.target.value)}
                                    className="bg-[#111921] border-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Headmaster</label>
                                <Input
                                    placeholder="e.g. @vespar"
                                    value={headmasterHandle}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHeadmasterHandle(e.target.value)}
                                    className="bg-[#111921] border-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Targeted Outcome (Optional)</label>
                            <textarea
                                placeholder="Describe what equilibrium state was reached..."
                                value={outcome}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutcome(e.target.value)}
                                className="w-full bg-[#111921] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none h-20 resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags (comma-separated)</label>
                            <Input
                                placeholder="EQ Range, Attractor, T-Witness"
                                value={tagsInput}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagsInput(e.target.value)}
                                className="bg-[#111921] border-slate-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Side: Event Logs Selection and Step Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#16202a] border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-full">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Calibration Logs & Steps Selection
                        </h3>

                        {!selectedSession ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 italic text-sm">
                                Select a session above to pull from its exchange history, or author steps manually below.
                            </div>
                        ) : selectedSession.eventLog.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 italic text-sm">
                                No exchanges logged in this session.
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                                {selectedSession.eventLog.map((e, idx) => {
                                    const eventId = `${e.timestamp}-${idx}`;
                                    const isSelected = !!selectedEvents[eventId];
                                    const detail = stepDetails[eventId];
                                    const content = e.type === 'AI_CHAT_COMPLETED' ? e.responseText
                                        : e.type === 'CONTRIBUTION' ? e.contentSummary
                                        : e.type === 'AI_CHAT_REQUESTED' ? e.prompt
                                        : '';

                                    const author = 'peerId' in e ? String(e.peerId) : '@tracey';

                                    if (!content) return null;

                                    return (
                                        <div
                                            key={eventId}
                                            className={`p-4 rounded-xl border transition-all space-y-4 ${
                                                isSelected
                                                    ? 'bg-primary/5 border-primary'
                                                    : 'bg-[#1a242e] border-slate-800 hover:border-slate-750'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleEvent(eventId, content, author)}
                                                    className="rounded border-border w-4 h-4 accent-primary cursor-pointer"
                                                    title="Select this log entry for step"
                                                    aria-label="Select this log entry for step"
                                                />
                                                <span className="font-mono text-xs font-bold text-slate-300">{author}</span>
                                                <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                                    {new Date(e.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-400 line-clamp-3 bg-[#111921] p-3 rounded-lg border border-slate-850">
                                                {content}
                                            </p>

                                            {isSelected && detail && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/40 animate-in fade-in duration-200">
                                                    <div className="sm:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Formation Phase</label>
                                                        <select
                                                            value={detail.formationPhase}
                                                            onChange={(evt) => handleStepDetailChange(eventId, 'formationPhase', evt.target.value)}
                                                            className="w-full bg-[#111921] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                                            title="Select Formation Phase"
                                                            aria-label="Select Formation Phase"
                                                        >
                                                            <option value="orienting">Orienting</option>
                                                            <option value="exploring">Exploring</option>
                                                            <option value="integrating">Integrating</option>
                                                            <option value="releasing">Releasing</option>
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step Type</label>
                                                        <select
                                                            value={detail.stepType}
                                                            onChange={(evt) => handleStepDetailChange(eventId, 'stepType', evt.target.value)}
                                                            className="w-full bg-[#111921] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                                            title="Select Step Type"
                                                            aria-label="Select Step Type"
                                                        >
                                                            <option value="attractor">Attractor</option>
                                                            <option value="calibration">Calibration</option>
                                                            <option value="response">Response</option>
                                                            <option value="breakthrough">Breakthrough</option>
                                                            <option value="anchor">Anchor</option>
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pedagogical Annotation</label>
                                                        <Input
                                                            placeholder="Why does this matter?"
                                                            value={detail.annotation}
                                                            onChange={(evt: React.ChangeEvent<HTMLInputElement>) => handleStepDetailChange(eventId, 'annotation', evt.target.value)}
                                                            className="bg-[#111921] border-slate-800 text-xs h-8"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Manual Calibration Steps</h4>
                                    <p className="text-[11px] text-slate-500 mt-1">Author steps directly when the source session has no usable exchanges.</p>
                                </div>
                                <Button type="button" onClick={handleAddManualStep} variant="outline" size="sm" className="gap-2">
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Manual Step
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {manualStepDrafts.map((step, idx) => (
                                    <div key={step.id} className="bg-[#1a242e] border border-slate-800 rounded-xl p-4 space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Manual Step {idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveManualStep(step.id)}
                                                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white"
                                            >
                                                Remove
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor={`manual-step-content-${step.id}`} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Manual Step Content</label>
                                            <textarea
                                                id={`manual-step-content-${step.id}`}
                                                value={step.content}
                                                onChange={(evt: React.ChangeEvent<HTMLTextAreaElement>) => handleManualStepChange(step.id, 'content', evt.target.value)}
                                                placeholder="Write the calibration step, prompt, response, or anchor to preserve..."
                                                className="w-full bg-[#111921] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none h-24 resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Author Handle</label>
                                                <Input
                                                    value={step.authorHandle}
                                                    onChange={(evt: React.ChangeEvent<HTMLInputElement>) => handleManualStepChange(step.id, 'authorHandle', evt.target.value)}
                                                    placeholder={substrateHandle || '@tracey'}
                                                    className="bg-[#111921] border-slate-800 text-xs h-8"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Formation Phase</label>
                                                <select
                                                    value={step.formationPhase}
                                                    onChange={(evt) => handleManualStepChange(step.id, 'formationPhase', evt.target.value)}
                                                    className="w-full bg-[#111921] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                                >
                                                    <option value="orienting">Orienting</option>
                                                    <option value="exploring">Exploring</option>
                                                    <option value="integrating">Integrating</option>
                                                    <option value="releasing">Releasing</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step Type</label>
                                                <select
                                                    value={step.stepType}
                                                    onChange={(evt) => handleManualStepChange(step.id, 'stepType', evt.target.value)}
                                                    className="w-full bg-[#111921] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                                >
                                                    <option value="attractor">Attractor</option>
                                                    <option value="calibration">Calibration</option>
                                                    <option value="response">Response</option>
                                                    <option value="breakthrough">Breakthrough</option>
                                                    <option value="anchor">Anchor</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pedagogical Annotation</label>
                                            <Input
                                                value={step.annotation}
                                                onChange={(evt: React.ChangeEvent<HTMLInputElement>) => handleManualStepChange(step.id, 'annotation', evt.target.value)}
                                                placeholder="Why this step matters"
                                                className="bg-[#111921] border-slate-800 text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function createManualStepDraft(): ManualStepDraft {
    return {
        id: crypto.randomUUID(),
        authorHandle: '',
        content: '',
        annotation: '',
        formationPhase: 'exploring',
        stepType: 'calibration',
    };
}

export default LessonPlanBuilder;
