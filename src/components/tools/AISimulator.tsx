import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, RefreshCw } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { supabase } from '../../core/supabase/client';
import { useAuthSession } from '../../core/auth/useAuthSession';
import { useGovernedOperations } from '../../core/mcp/useGovernedOperations';
import { PERSONA_PACK } from '../../core/aiSim/rolePack';
import type { AutoReplyTurn } from '../../core/aiSim/simUtils';
import { generateAutoReply } from '../../core/aiSim/simUtils';
import type { Message, Thread, BoardPeer } from '../../types';

export default function AISimulator() {
    const { session, user } = useAuthSession();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [peers, setPeers] = useState<BoardPeer[]>([]);
    const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // AI Simulator State
    const [selectedSimPersonaId, setSelectedSimPersonaId] = useState('lumin');
    const [simAIMessage, setSimAIMessage] = useState('');
    const [simAutoReplyMode, setSimAutoReplyMode] = useState('Acknowledge + Ask');
    const [isSequenceRunning, setIsSequenceRunning] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const sequenceAbortControllerRef = useRef<AbortController | null>(null);

    const { proposeReadOnlyToolCall, recordResult } = useGovernedOperations('shared-board');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [threadsRes, peersRes] = await Promise.all([
            supabase.from('threads').select('*').order('created_at', { ascending: false }),
            supabase.from('peers').select('*').eq('is_active', true)
        ]);

        if (threadsRes.data) {
            setThreads(threadsRes.data);
            if (threadsRes.data.length > 0 && !selectedThreadId) {
                setSelectedThreadId(threadsRes.data[0].id);
            }
        }
        if (peersRes.data) {
            setPeers(peersRes.data);
            const self = peersRes.data.find(p => p.auth_user_id === user?.id);
            if (self && !selectedPeerId) setSelectedPeerId(self.id);
        }
        setIsLoading(false);
    }, [user, selectedThreadId, selectedPeerId]);

    const fetchMessages = useCallback(async (threadId: string) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectedThreadId) {
            fetchMessages(selectedThreadId);
            const channel = supabase.channel(`sim-thread-${selectedThreadId}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${selectedThreadId}` },
                    () => fetchMessages(selectedThreadId))
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [selectedThreadId, fetchMessages]);

    useEffect(() => {
        if (cooldownRemaining > 0) {
            const timer = setInterval(() => setCooldownRemaining(p => Math.max(0, p - 1)), 1000);
            return () => clearInterval(timer);
        }
    }, [cooldownRemaining]);

    const simulateAIMessage = async () => {
        if (!session || !user || !simAIMessage.trim() || !selectedThreadId) return;

        const persona = PERSONA_PACK[selectedSimPersonaId] || PERSONA_PACK.lumin;
        const authorPeerId = selectedPeerId || user.id;

        const opId = proposeReadOnlyToolCall({
            toolId: 'ai.simulate_message',
            toolName: 'Simulate AI Message',
            intent: `Simulate AI post as ${persona.label} into thread ${selectedThreadId}`,
            scope: ['supabase', 'messages'],
            constraints: ['append-only'],
            rationale: 'DEV simulation of AI peer presence.'
        }, { peerId: authorPeerId });

        try {
            const body = simAIMessage.trim();
            setSimAIMessage('');

            const { data, error } = await supabase.from('messages').insert([{
                thread_id: selectedThreadId,
                author_peer_id: authorPeerId,
                author_peer_type: 'human',
                kind: `ai_sim|${persona.label}`,
                body: body
            }]).select().single();

            if (error) throw error;
            if (data) recordResult(opId, 'success', { messageId: data.id });
        } catch (err: unknown) {
            recordResult(opId, 'error', { error: err instanceof Error ? err.message : String(err) });
        }
    };

    const performAutoReply = async (personaId: string, mode: string, currentMsgs: Message[], anchor?: Message, priorTurns: AutoReplyTurn[] = []) => {
        if (!session || !user || !selectedThreadId) return null;

        const persona = PERSONA_PACK[personaId] || PERSONA_PACK.lumin;
        const threadTitle = threads.find(t => t.id === selectedThreadId)?.title;

        const anchorMsg = anchor || [...currentMsgs].reverse().find(m =>
            m.author_peer_type === 'human' && !m.kind?.includes('ai_')
        ) || currentMsgs[currentMsgs.length - 1];

        const { body, variantId, pointsUsed } = generateAutoReply(personaId, mode, selectedThreadId, threadTitle, anchorMsg, currentMsgs, priorTurns);
        const authorPeerId = selectedPeerId || user.id;

        const opId = proposeReadOnlyToolCall({
            toolId: "ai.auto_reply",
            toolName: "AI Auto Reply (Simulated)",
            intent: `Auto-reply as ${persona.label} (${variantId})`,
            scope: ['supabase', 'messages'],
            constraints: ['append-only'],
            rationale: "DEV Stress Test turn."
        }, { peerId: authorPeerId });

        try {
            const { data, error } = await supabase.from('messages').insert([{
                thread_id: selectedThreadId,
                author_peer_id: authorPeerId,
                author_peer_type: 'human',
                kind: `ai_auto|${persona.label}`,
                body: body
            }]).select().single();

            if (error) throw error;
            if (data) {
                recordResult(opId, 'success', { messageId: data.id });
                return { msg: data, points: pointsUsed };
            }
        } catch (err: unknown) {
            recordResult(opId, 'error', { error: err instanceof Error ? err.message : String(err) });
        }
        return null;
    };

    const handleAutoReplySequence = async () => {
        if (!selectedThreadId || isSequenceRunning || cooldownRemaining > 0) return;
        setIsSequenceRunning(true);
        sequenceAbortControllerRef.current = new AbortController();
        const { signal } = sequenceAbortControllerRef.current;

        const anchor = [...messages].reverse().find(m => m.author_peer_type === 'human' && !m.kind?.includes('ai_')) || messages[messages.length - 1];
        const personas = ['lumin', 'haven', 'shield'];
        let currentTemp = [...messages];
        const priorTurns: AutoReplyTurn[] = [];

        try {
            for (const pId of personas) {
                if (signal.aborted) break;
                const res = await performAutoReply(pId, simAutoReplyMode, currentTemp, anchor, priorTurns);
                if (res) {
                    currentTemp = [...currentTemp, res.msg];
                    priorTurns.push({ personaId: pId, body: res.msg.body, keyPoints: res.points });
                }
                if (personas.indexOf(pId) < personas.length - 1) await new Promise(r => setTimeout(r, 800));
            }
        } finally {
            setIsSequenceRunning(false);
            setCooldownRemaining(10);
        }
    };

    if (isLoading) return <div className="text-center p-8 text-muted-foreground animate-pulse">Initializing Simulator Environment...</div>;

    return (
        <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-purple-600 flex items-center gap-2">
                    <Bot className="w-4 h-4" /> Simulation Controller
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Thread</label>
                        <select
                            title="Select Target Thread"
                            className="w-full bg-background border border-border rounded p-2 text-xs"
                            value={selectedThreadId || ''}
                            onChange={e => setSelectedThreadId(e.target.value)}
                        >
                            {threads.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Act As Peer</label>
                        <select
                            title="Select Identity to act as"
                            className="w-full bg-background border border-border rounded p-2 text-xs"
                            value={selectedPeerId || ''}
                            onChange={e => setSelectedPeerId(e.target.value)}
                        >
                            {peers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">AI Persona</label>
                        <select
                            title="Select AI Persona to simulate"
                            className="w-full bg-background border border-border rounded p-2 text-xs"
                            value={selectedSimPersonaId}
                            onChange={e => setSelectedSimPersonaId(e.target.value)}
                        >
                            {Object.values(PERSONA_PACK).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-3 p-4 rounded bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold flex items-center gap-1.5">
                            <Send className="w-3 h-3" /> Manual Post Simulation
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Type simulated AI response..."
                            value={simAIMessage}
                            onChange={e => setSimAIMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && simulateAIMessage()}
                            className="flex-1"
                        />
                        <Button onClick={simulateAIMessage} disabled={!simAIMessage.trim() || !selectedThreadId}>
                            Post
                        </Button>
                    </div>
                </div>

                <div className="space-y-3 p-4 rounded bg-background/50 border border-border/50">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold flex items-center gap-1.5 text-purple-600">
                            <RefreshCw className="w-3 h-3" /> Auto-Reply Automation
                        </h3>
                        {cooldownRemaining > 0 && <span className="text-[10px] text-orange-500 font-mono">Cooldown: {cooldownRemaining}s</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select
                            title="Select Auto-Reply Mode"
                            className="w-full bg-background border border-border rounded p-2 text-xs"
                            value={simAutoReplyMode}
                            onChange={e => setSimAutoReplyMode(e.target.value)}
                            disabled={isSequenceRunning}
                        >
                            <option value="Acknowledge + Ask">Acknowledge + Ask</option>
                            <option value="Summarize last 3">Summarize last 3</option>
                            <option value="Suggest next steps">Suggest next steps</option>
                            <option value="Challenge assumption">Challenge assumption</option>
                            <option value="Governance lens">Governance lens</option>
                        </select>
                        <Button
                            variant="outline"
                            className="border-purple-500/50 text-purple-600 hover:bg-purple-500/10"
                            onClick={handleAutoReplySequence}
                            disabled={!selectedThreadId || isSequenceRunning || cooldownRemaining > 0 || messages.length === 0}
                        >
                            {isSequenceRunning ? "Sequence Running..." : "Start Stress Test Sequence (x3)"}
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Note: This mode does not call live LLM providers. It uses deterministic behavioral templates.</p>
                </div>
            </CardContent>
        </Card>
    );
}
