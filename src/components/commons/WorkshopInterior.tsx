import { useState, useRef, useEffect } from 'react';
import { useCommons } from '../../hooks/useCommons';
import type { WorkshopMessage, ConnectedModel } from '../../types/commons';
import {
    Volume2,
    VolumeX,
    User,
    Bot,
    ChevronDown,
    Clock,
    Send,
    Loader2,
    Info
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function WorkshopInterior() {
    const {
        connectedModels,
        messages,
        addMessage,
        explorationPhase,
        currentTurnIndex,
        roundRobinOrder,
        startRoundRobin,
        audioEnabled,
        setAudioEnabled
    } = useCommons();

    const [inputText, setInputText] = useState('');
    const [selectedPosture, setSelectedPosture] = useState<'Identify' | 'Define' | 'Suggest' | undefined>();
    const [isGovOpen, setIsGovOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, currentTurnIndex]);

    // Initial Seed
    useEffect(() => {
        if (messages.length === 0) {
            // Seed hardcoded v1 contributions
            addMessage({
                participant: 'System',
                participantType: 'human',
                content: 'Artifact Initialized: How should AI peers handle disagreement when coherence is desired?',
                posture: 'Define'
            });
            setTimeout(() => {
                addMessage({
                    participant: 'Gemini',
                    participantType: 'ai',
                    content: 'Coherence should be sought through iterative clarification rather than forced averaging of outputs.',
                    posture: 'Identify'
                });
            }, 500);
            setTimeout(() => {
                addMessage({
                    participant: 'GPT-4o',
                    participantType: 'ai',
                    content: 'A disagreement should trigger a synthesis mode where the delta between perspectives is explicitly mapped.',
                    posture: 'Define'
                });
            }, 1000);
        }
    }, [addMessage, messages.length]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        startRoundRobin(inputText);
        setInputText('');
        setSelectedPosture(undefined);
    };

    return (
        <div className="h-full flex flex-col bg-[#0a0f14] text-slate-100 font-display overflow-hidden">
            {/* Header */}
            <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0a0f14]/80 backdrop-blur-md z-30">
                <div className="flex items-center gap-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Artifact 01</div>
                    <h2 className="text-sm font-bold text-white tracking-tight">Governance & Collaborative AI</h2>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                        title={audioEnabled ? "Mute audio" : "Unmute audio"}
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsGovOpen(!isGovOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#197fe6]/10 border border-[#197fe6]/20 text-[#197fe6] text-[10px] font-bold uppercase tracking-wider hover:bg-[#197fe6]/20 transition-all"
                        >
                            AEGIS Active
                            <ChevronDown className={cn("w-3 h-3 transition-transform", isGovOpen && "rotate-180")} />
                        </button>

                        {isGovOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-[#111c26] border border-slate-800 rounded-lg shadow-2xl p-4 z-50 space-y-4">
                                <div className="border-b border-slate-800 pb-2">
                                    <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">AEGIS Framework — Active</h3>
                                </div>
                                <div className="space-y-4 text-[10px] text-slate-400">
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-200">Protocol</div>
                                        <div>• IDS Mode: Exploratory</div>
                                        <div>• Round-Robin: Sequential</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-200">Transparency</div>
                                        <div>• Contributions Logged</div>
                                        <div>• Append-Only Ledger</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-200">Registry</div>
                                        <div>• Session: Ephemeral</div>
                                        <div>• Identity: Local</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-200">Sovereignty</div>
                                        <div>• Human-Initiated</div>
                                        <div>• Human-Interruptible</div>
                                        <div>• No Forced Convergence</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Panel - Participants */}
                <aside className="w-64 border-r border-slate-800 bg-[#0a0f14] p-6 space-y-6">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Participants</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                <span className="text-sm font-medium text-white">You</span>
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Active</span>
                        </div>
                        {connectedModels.filter((m: ConnectedModel) => m.status === 'Connected').map((model: ConnectedModel) => (
                            <div key={model.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500/50" />
                                    <span className="text-sm font-medium text-slate-300">{model.model}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Connected</span>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Center - Workshop Thread */}
                <main className="flex-1 flex flex-col min-w-0 bg-[#070b0f]">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-12">
                        {messages.map((msg: WorkshopMessage) => (
                            <div key={msg.id} className="max-w-3xl mx-auto group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-6 h-6 rounded flex items-center justify-center border",
                                            msg.participantType === 'human' ? "bg-white text-black border-white" : "bg-slate-800 text-[#197fe6] border-slate-700"
                                        )}>
                                            {msg.participantType === 'human' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                        </div>
                                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{msg.participant}</span>
                                        {msg.posture && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-800 text-slate-500 bg-slate-900/50 uppercase font-bold tracking-tighter">
                                                {msg.posture}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                                        <Clock className="w-3 h-3" />
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </div>
                                </div>
                                <div className="pl-9 text-lg leading-relaxed text-slate-200 font-normal">
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {currentTurnIndex !== null && (
                            <div className="max-w-3xl mx-auto animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-6 h-6 rounded bg-[#197fe6]/10 text-[#197fe6] flex items-center justify-center border border-[#197fe6]/20">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    </div>
                                    <span className="text-xs font-bold text-[#197fe6] uppercase tracking-wider">
                                        {connectedModels.find((m: ConnectedModel) => m.id === roundRobinOrder[currentTurnIndex!])?.model} Processing...
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Composer */}
                    <div className="p-8 border-t border-slate-800/50 bg-[#0a0f14]">
                        <div className="max-w-3xl mx-auto space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                {(['Identify', 'Define', 'Suggest'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedPosture(p === selectedPosture ? undefined : p)}
                                        className={cn(
                                            "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-tight transition-all",
                                            selectedPosture === p
                                                ? "bg-[#197fe6] text-white"
                                                : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <div className="flex-1" />
                                {currentTurnIndex !== null && (
                                    <div className="text-[10px] font-bold text-[#197fe6] animate-pulse uppercase tracking-[0.2em]">
                                        Round-Robin Sequence Initiated
                                    </div>
                                )}
                            </div>
                            <div className="relative group">
                                <textarea
                                    className="w-full bg-transparent border border-slate-800 rounded-lg p-4 pr-16 text-slate-200 focus:outline-none focus:border-slate-600 transition-colors resize-none h-24"
                                    placeholder="Add to the workshop dialogue..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    className="absolute right-4 bottom-4 p-2 rounded-lg bg-[#197fe6] text-white hover:bg-[#197fe6]/90 transition-all shadow-lg shadow-[#197fe6]/20"
                                    title="Send message"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Panel - Chamber State */}
                <aside className="w-72 border-l border-slate-800 bg-[#0a0f14] p-6 space-y-8">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chamber State</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-slate-500 uppercase">Awareness</span>
                                <span className="text-white">92%</span>
                            </div>
                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#197fe6] w-[92%]" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase font-bold italic tracking-tighter">Exploration Phase</span>
                                <span className="text-xs font-semibold text-slate-200">{explorationPhase}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase font-bold italic tracking-tighter">Position</span>
                                <span className="text-xs font-semibold text-slate-200">{currentTurnIndex !== null ? currentTurnIndex + 1 : 0} / {roundRobinOrder.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 uppercase font-bold italic tracking-tighter">Lock</span>
                                <span className="text-xs font-semibold text-slate-400">Inactive (Exploratory)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 space-y-4 border-t border-slate-800/50">
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-[#197fe6]/5 border border-[#197fe6]/10">
                            <Info className="w-4 h-4 text-[#197fe6] shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed text-[#197fe6]/80 font-medium">
                                State is derived from participation and posture distribution. Sovereign control is maintained.
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
