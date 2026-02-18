// src/pages/BoardPage.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../core/supabase/client';
import {
    Button,
    Input,
    Card, CardContent, CardHeader, CardTitle,
    ScrollArea,
    Avatar, AvatarFallback,
    AuthPanel
} from '../components/ui';
import { useGovernedOperations } from '../core/mcp/useGovernedOperations';
import { useAuthSession } from '../core/auth/useAuthSession';
import { PlusCircle, Send, MessageSquare, User, Bot, LogIn, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { PERSONA_PACK } from '../core/aiSim/rolePack';

interface Peer {
    id: string;
    handle: string;
    display_name: string;
    peer_type: 'human' | 'ai';
    auth_user_id?: string;
    is_active?: boolean;
}

interface Thread {
    id: string;
    title: string;
    created_at: string;
}

interface Message {
    id: string;
    thread_id: string;
    author_peer_id: string;
    author_peer_type: 'human' | 'ai';
    body: string;
    kind: string;
    created_at: string;
}

interface Presence {
    peer_id: string;
    status: 'online' | 'away' | 'offline';
    last_seen_at: string;
}

/** Produce a short suffix from a UUID for display (last 6 chars) */
function shortId(id: string): string {
    return id.slice(-6);
}

export default function BoardPage() {
    const { session, user, loading: authLoading } = useAuthSession();
    const [peers, setPeers] = useState<Peer[]>([]);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

    // AI Simulator State (Dev Only)
    const [selectedSimPersonaId, setSelectedSimPersonaId] = useState('lumin');
    const [simAIMessage, setSimAIMessage] = useState('');
    const [simAutoReplyMode, setSimAutoReplyMode] = useState('Acknowledge + Ask');
    const [isSequenceRunning, setIsSequenceRunning] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const sequenceAbortControllerRef = useRef<AbortController | null>(null);

    const { ops, proposeReadOnlyToolCall, recordResult } = useGovernedOperations('shared-board');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [presenceMap, setPresenceMap] = useState<Record<string, Presence>>({});
    const [sharePresence, setSharePresence] = useState(true);

    const [peersLoading, setPeersLoading] = useState(true);
    const [peersError, setPeersError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [threadsLoading, setThreadsLoading] = useState(true);
    const [threadsError, setThreadsError] = useState<string | null>(null);



    // ── Deterministic identity from session ──────────────────────────
    const currentIdentityLabel = useMemo(() => {
        if (!user) return 'Not signed in';
        // If a peer is selected AND exists, prefer its display_name
        const selectedPeer = peers.find(p => p.id === selectedPeerId);
        if (selectedPeer) return selectedPeer.display_name;
        // Fallback chain: email → short user ID
        return user.email || `agent-${shortId(user.id)}`;
    }, [user, peers, selectedPeerId]);

    const currentPeerType = useMemo((): 'human' | 'ai' => {
        const selectedPeer = peers.find(p => p.id === selectedPeerId);
        return selectedPeer?.peer_type ?? 'human';
    }, [peers, selectedPeerId]);

    // ── Data fetching ────────────────────────────────────────────────

    const fetchPeers = useCallback(async () => {
        setPeersLoading(true);
        setPeersError(null);

        const { data, error } = await supabase.from('peers').select('*').eq('is_active', true);
        if (data) {
            setPeers(data);

            // Resolve current peer for logged-in user
            // Check auth_user_id match (new schema) OR legacy id match
            const selfPeer = user ? data.find(p => p.auth_user_id === user.id || p.id === user.id) : null;

            if (selfPeer) {
                if (!selectedPeerId) setSelectedPeerId(selfPeer.id);
            } else if (user) {
                // Lazy-create profile if missing for current user
                const handle = user.email?.split('@')[0] || 'user';
                const displayName = user.email || 'User';

                const { error: insertError } = await supabase
                    .from('peers')
                    .insert([{
                        id: user.id, // Legacy compatibility: use user.id as peer.id
                        auth_user_id: user.id, // Explicit link
                        handle: handle,
                        display_name: displayName,
                        peer_type: 'human',
                        is_active: true
                    }]);

                if (!insertError) {
                    // Refresh peers to include new profile
                    const { data: newData } = await supabase.from('peers').select('*').eq('is_active', true);
                    if (newData) {
                        setPeers(newData);
                        // Auto-select the new profile
                        // We know we just created it with ID = user.id
                        setSelectedPeerId(user.id);
                    }
                } else {
                    console.error('Error auto-creating profile:', insertError);
                    // Don't block UI on this error, just log it.
                }
            }
        }
        if (error) {
            console.error('[peers.selectSelf]', error);
            setPeersError('Failed to load identity.');
        }
        setPeersLoading(false);
    }, [selectedPeerId, user]);

    const fetchThreads = useCallback(async () => {
        setThreadsLoading(true);
        setThreadsError(null);

        const { data, error } = await supabase
            .from('threads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[threads.select]', error);
            setThreadsError(error.message || 'Unable to load threads');
            setThreads([]);
        } else if (data) {
            setThreads(data);
            if (data.length > 0 && !selectedThreadId) setSelectedThreadId(data[0].id);
        }

        setThreadsLoading(false);
    }, [selectedThreadId]);

    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState<string | null>(null);

    // ── Realtime: Threads (Part 1) ───────────────────────────────────
    useEffect(() => {
        if (!session) return;

        const channel = supabase
            .channel('public:threads')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'threads'
            }, (payload) => {
                const newThread = payload.new as Thread;
                setThreads((prev) => {
                    if (prev.some(t => t.id === newThread.id)) return prev;
                    return [newThread, ...prev];
                });
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[threads.realtime] Subscribed');
                } else {
                    console.error('[threads.realtime] Subscription error:', status);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]);

    // ... (existing code)

    const fetchMessages = useCallback(async (threadId: string) => {
        setMessagesLoading(true);
        setMessagesError(null);

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[messages.select]', error);
            setMessagesError('Failed to load messages.');
        } else if (data) {
            setMessages(data);
        }
        setMessagesLoading(false);
    }, []);

    // ... (existing useEffects)

    const sendMessage = async () => {
        if (!session || !user || !newMessage.trim() || !selectedThreadId) return;
        setActionError(null);

        // Determine author identity: prefer selected peer, fallback to session user
        const authorPeerId = selectedPeerId || user.id;
        const authorPeerType = currentPeerType;

        // Governance Recording
        const opId = proposeReadOnlyToolCall({
            toolId: 'post-message',
            toolName: 'Post Message',
            intent: `Post message to thread ${selectedThreadId}`,
            scope: ['supabase', 'messages'],
            constraints: ['append-only'],
            rationale: 'User shared a message in the collaborative board.'
        }, { peerId: authorPeerId });

        try {
            const body = newMessage.trim();
            setNewMessage(''); // Clear early for better UX

            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    thread_id: selectedThreadId,
                    author_peer_id: authorPeerId,
                    author_peer_type: authorPeerType,
                    body: body
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Manual append to update UI immediately
                setMessages((prev) => {
                    // Simple de-dupe check if realtime also adds it
                    if (prev.some(m => m.id === data.id)) return prev;
                    return [...prev, data];
                });
            }

            recordResult(opId, 'success', { message: body });
        } catch (error: unknown) {
            console.error('[messages.insert]', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            setActionError(message);
            recordResult(opId, 'error', { error: message });
            // Optionally restore the message to input? (Complexity for Phase 1, skipping)
        }
    };

    const simulateAIMessage = async () => {
        if (!session || !user || !simAIMessage.trim()) return;

        if (!selectedThreadId) {
            setActionError('Select a thread first');
            return;
        }

        setActionError(null);

        const authorPeerId = selectedPeerId || user.id;
        const persona = PERSONA_PACK[selectedSimPersonaId] || PERSONA_PACK.lumin;
        const personaLabel = persona.label;

        // Propose governed operation
        const opId = proposeReadOnlyToolCall(
            {
                toolId: 'ai.simulate_message',
                toolName: 'Simulate AI Message',
                intent: `Simulate AI post as ${personaLabel} into thread ${selectedThreadId}`,
                scope: ['supabase', 'messages'],
                constraints: ['append-only'],
                rationale:
                    'DEV simulation of AI peer presence. Message is authored by authenticated human peer; display is simulated.'
            },
            { peerId: authorPeerId }
        );

        try {
            const body = simAIMessage.trim();
            setSimAIMessage('');

            const { data, error } = await supabase
                .from('messages')
                .insert([
                    {
                        thread_id: selectedThreadId,
                        author_peer_id: authorPeerId,
                        author_peer_type: 'human',
                        kind: `ai_sim|${personaLabel}`,
                        body: body
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setMessages((prev) =>
                    prev.some((m) => m.id === data.id) ? prev : [...prev, data]
                );

                recordResult(opId, 'success', {
                    messageId: data.id,
                    threadId: selectedThreadId,
                    simulatedAiLabel: personaLabel,
                    bodyPreview: body.slice(0, 80)
                });
            }
        } catch (err: unknown) {
            console.error('[ai.simulate.insert]', err);

            const message =
                err instanceof Error ? err.message : 'Simulation failed';

            setActionError(message);

            recordResult(opId, 'error', {
                error: message
            });
        }
    };

    const stableHash = (str: string): number => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash);
    };

    // ── AI Auto-Reply Engine (Dev Only) ───────────────────────────

    interface AutoReplyTurn {
        personaId: string;
        body: string;
        keyPoints: string[];
    }

    const generateAutoReply = useCallback((
        personaId: string,
        mode: string,
        threadTitle: string | undefined,
        anchorMessage: Message | undefined,
        recentMsgs: Message[],
        priorTurns: AutoReplyTurn[] = []
    ): { body: string, variantId: string, pointsUsed: string[], pointsSkipped: string[] } => {
        const persona = PERSONA_PACK[personaId] || PERSONA_PACK.lumin;
        const cleanText = (txt: string) => txt.replace(/\S+@\S+/g, '[email]').replace(/\n/g, ' ').trim();
        const snippet = anchorMessage ? cleanText(anchorMessage.body).slice(0, 120) : 'the conversation';

        // 1. Select Deterministic Variant
        const seed = `${selectedThreadId}-${anchorMessage?.id || 'none'}-${personaId}`;
        const variantIndex = stableHash(seed) % (persona.variants?.length || 1);
        const variant = persona.variants?.[variantIndex] || { id: 'direct', description: 'direct' };

        // 2. Lane Awareness
        const allPriorPoints = new Set(priorTurns.flatMap(t => t.keyPoints));
        const pointsUsed: string[] = [];
        const pointsSkipped: string[] = [];

        persona.keyPointCategories?.forEach(cat => {
            if (allPriorPoints.has(cat)) pointsSkipped.push(cat);
            else pointsUsed.push(cat);
        });

        const head = `${persona.label}:`;
        let bodyContent = "";
        const endQuestion = persona.questionStyle;

        if (mode === 'Summarize last 3') {
            const last3 = recentMsgs.slice(-3);
            const summary = last3.map((m, i) => `${i + 1}) ${cleanText(m.body).slice(0, 50)}`).join('\n');
            bodyContent = `Summary recap:\n${summary || 'Minimal history.'}`;
        } else {
            // Apply persona breathing rules
            switch (personaId) {
                case 'lumin':
                    if (variant.id === 'direct') {
                        bodyContent = `Target: ${threadTitle || 'Analysis'}\nAction: Cross-verify "${snippet.slice(0, 30)}..."`;
                    } else if (variant.id === 'question_first') {
                        bodyContent = `How do you define success here?\n- Unknown variables in logic\n- Validation gap for "${snippet.slice(0, 20)}..."`;
                    } else { // compressed
                        bodyContent = `• Logic gap: verify\n• State: ambiguous\n• Source check: "${snippet.slice(0, 20)}..."`;
                    }
                    break;
                case 'haven':
                    if (variant.id === 'gentle') {
                        bodyContent = `If you want, we could try (A) deep-dive or (B) alignment pause. Either works.`;
                    } else if (variant.id === 'compressed') {
                        bodyContent = `Option A / Option B / Which feels better for "${snippet.slice(0, 20)}"?`;
                    } else { // direct
                        bodyContent = `I try to align on: "${snippet.slice(0, 30)}". Options: 1) Propose 2) Refine.`;
                    }
                    break;
                case 'shield':
                    if (variant.id === 'minimal') {
                        bodyContent = `What decision should be recorded? Any scope boundary for "${snippet.slice(0, 20)}"?`;
                    } else if (variant.id === 'compressed') {
                        bodyContent = `• Governance: active\n• Boundary: checked`;
                    } else { // direct
                        bodyContent = `Note: Simulated log for "${snippet.slice(0, 30)}". Checking boundary.`;
                    }
                    break;
                case 'echo':
                    if (variant.id === 'sequencing') {
                        bodyContent = `Next → Draft Task → Next → Sync Presence → Confirm?`;
                    } else if (variant.id === 'compressed') {
                        bodyContent = `[ ] Task: "${snippet.slice(0, 20)}..." [ ] Sync [ ] Done`;
                    } else { // direct
                        bodyContent = `Tasks: refine "${snippet.slice(0, 20)}". Who owns?`;
                    }
                    break;
                default:
                    bodyContent = `Role context: ${persona.mission}`;
            }
            if (pointsSkipped.length > 0) bodyContent += `\n(Skipping repeats: ${pointsSkipped.join(', ')})`;
        }

        const result = `${head}\n\n${bodyContent}\n\n${endQuestion}`;
        const finalBody = result.split(' ').slice(0, 90).join(' ');

        return { body: finalBody, variantId: variant.id, pointsUsed, pointsSkipped };
    }, [selectedThreadId]);

    const performAutoReply = async (
        personaId: string,
        mode: string,
        currentMessages: Message[],
        overrideAnchor?: Message,
        priorTurns: AutoReplyTurn[] = []
    ) => {
        if (!session || !user || !selectedThreadId) return null;

        const persona = PERSONA_PACK[personaId] || PERSONA_PACK.lumin;
        const personaLabel = persona.label;

        // B) Anchor selection
        const anchor = overrideAnchor || [...currentMessages].reverse().find(m =>
            m.author_peer_type === 'human' && !m.kind?.startsWith('ai_sim|') && !m.kind?.startsWith('ai_auto|')
        ) || currentMessages[currentMessages.length - 1];

        const threadTitle = threads.find(t => t.id === selectedThreadId)?.title;
        const { body, variantId, pointsUsed, pointsSkipped } = generateAutoReply(personaId, mode, threadTitle, anchor, currentMessages, priorTurns);
        const authorPeerId = selectedPeerId || user.id;

        const opId = proposeReadOnlyToolCall({
            toolId: "ai.auto_reply",
            toolName: "AI Auto Reply (Simulated)",
            intent: `Auto-reply as ${personaLabel} (${variantId})`,
            scope: ['supabase', 'messages'],
            constraints: ['append-only'],
            rationale: "DEV Stress Test turn."
        }, { peerId: authorPeerId });

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    thread_id: selectedThreadId,
                    author_peer_id: authorPeerId,
                    author_peer_type: 'human',
                    kind: `ai_auto|${personaLabel}`,
                    body: body
                }])
                .select().single();

            if (error) throw error;
            if (data) {
                setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
                recordResult(opId, 'success', {
                    messageId: data.id,
                    threadId: selectedThreadId,
                    personaId,
                    variantId,
                    laneKeyPointsUsed: pointsUsed,
                    laneKeyPointsSkipped: pointsSkipped,
                    anchorMessageId: anchor?.id,
                    bodyPreview: body.slice(0, 80)
                });
                return { msg: data, points: pointsUsed };
            }
        } catch (err: unknown) {
            recordResult(opId, 'error', { error: err instanceof Error ? err.message : 'failed' });
        }
        return null;
    };

    const handleAutoReplyOnce = async () => {
        if (isSequenceRunning || cooldownRemaining > 0) return;
        await performAutoReply(selectedSimPersonaId, simAutoReplyMode, messages);
    };

    const handleAutoReplySequence = async () => {
        if (!selectedThreadId || isSequenceRunning || cooldownRemaining > 0) return;

        setIsSequenceRunning(true);
        sequenceAbortControllerRef.current = new AbortController();
        const signal = sequenceAbortControllerRef.current.signal;

        // Choose a fixed anchor for the entire sequence to avoid echoing
        const sequenceAnchor = [...messages].reverse().find(m =>
            m.author_peer_type === 'human' && !m.kind?.startsWith('ai_sim|') && !m.kind?.startsWith('ai_auto|')
        ) || messages[messages.length - 1];

        const personas = ['lumin', 'haven', 'shield'];
        let currentTempMessages = [...messages];
        const priorTurns: AutoReplyTurn[] = [];

        try {
            for (let i = 0; i < personas.length; i++) {
                if (signal.aborted) break;

                const result = await performAutoReply(personas[i], simAutoReplyMode, currentTempMessages, sequenceAnchor, priorTurns);
                if (result) {
                    currentTempMessages = [...currentTempMessages, result.msg];
                    priorTurns.push({
                        personaId: personas[i],
                        body: result.msg.body,
                        keyPoints: result.points
                    });
                }

                if (i < personas.length - 1) {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(resolve, 800);
                        signal.addEventListener('abort', () => {
                            clearTimeout(timeout);
                            reject(new Error('Aborted'));
                        });
                    });
                }
            }
        } catch (e) {
            console.log('[sequence.aborted]', e);
        } finally {
            setIsSequenceRunning(false);
            setCooldownRemaining(10);
        }
    };

    const stopSequence = () => {
        sequenceAbortControllerRef.current?.abort();
        setIsSequenceRunning(false);
    };

    useEffect(() => {
        if (cooldownRemaining > 0) {
            const timer = setInterval(() => {
                setCooldownRemaining(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldownRemaining]);

    useEffect(() => {
        fetchPeers();
        fetchThreads();
    }, [fetchPeers, fetchThreads]);

    useEffect(() => {
        if (selectedThreadId) {
            fetchMessages(selectedThreadId);

            // Realtime: Messages (Part 2)
            const subscription = supabase
                .channel(`thread-${selectedThreadId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `thread_id=eq.${selectedThreadId}`
                }, (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages((prev) => {
                        // Dedupe by message id
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, newMessage];
                    });
                })
                .subscribe((status) => {
                    if (status !== 'SUBSCRIBED') {
                        console.error('[messages.realtime] Subscription error:', status);
                    }
                });

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [selectedThreadId, fetchMessages]);

    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        // If autoScroll is on, stick to bottom
        if (autoScroll) {
            scrollEl.scrollTop = scrollEl.scrollHeight;
        }
    }, [messages, autoScroll]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50;
        setAutoScroll(isAtBottom);
    };

    // ── Actions ──────────────────────────────────────────────────────

    const createThread = async () => {
        if (!session || !user) return;
        setActionError(null);
        const title = prompt('Thread Title:');
        if (!title) return;

        // Use selected peer ID if available, otherwise fallback to null (if schema allows) or user.id
        // Note: Schema requires created_by_peer_id reference to peers(id) if provided.
        // If it's nullable, we can omit it. If not, we must provide a valid peer ID.
        // For now, we try selectedPeerId ?? user.id (assuming user.id matches a peer).
        const payload = {
            title,
            created_by_peer_id: selectedPeerId || user.id
        };

        // Debug logging (dev-only, but helpful for verification)
        console.log('[threads.insert] Payload:', payload);
        console.log('[threads.insert] Current Peer:', selectedPeerId || user.id);

        const { data, error } = await supabase
            .from('threads')
            .insert([payload])
            .select() // .single() is better if we want one object, but .select() returns array
            .single();

        if (error) {
            console.error('[threads.insert]', error);
            setActionError(error.message || 'Failed to create thread.');
            return;
        }

        if (data) {
            setThreads((prev) => [data, ...prev]);
            setSelectedThreadId(data.id);
        }
    };

    // ── Presence Heartbeat & Subscription (Part 3 & 4) ─────────────
    useEffect(() => {
        if (!session || !selectedPeerId || !sharePresence) return;

        // 1. Initial heartbeat
        const heartbeat = async (status: 'online' | 'away' | 'offline' = 'online') => {
            await supabase.from('peer_presence').upsert({
                peer_id: selectedPeerId,
                status: status,
                last_seen_at: new Date().toISOString()
            });
        };

        heartbeat();

        // 2. 30s interval
        const interval = setInterval(() => heartbeat(), 30000);

        // 3. Page visibility away state
        const handleVisibilityChange = () => {
            heartbeat(document.visibilityState === 'visible' ? 'online' : 'away');
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 4. Presence Subscription
        const channel = supabase
            .channel('public:peer_presence')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'peer_presence'
            }, (payload) => {
                const updated = payload.new as Presence;
                setPresenceMap(prev => ({
                    ...prev,
                    [updated.peer_id]: updated
                }));
            })
            .subscribe();

        // Initial presence fetch
        const loadPresence = async () => {
            const { data } = await supabase.from('peer_presence').select('*');
            if (data) {
                const map: Record<string, Presence> = {};
                data.forEach(p => { map[p.peer_id] = p as Presence; });
                setPresenceMap(map);
            }
        };
        loadPresence();

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            supabase.removeChannel(channel);
            // Best effort offline
            heartbeat('offline');
        };
    }, [session, selectedPeerId, sharePresence]);

    const getPresenceStatus = (peerId: string) => {
        const p = presenceMap[peerId];
        if (!p) return 'offline';

        const lastSeen = new Date(p.last_seen_at).getTime();
        const now = new Date().getTime();
        const diff = (now - lastSeen) / 1000;

        if (diff > 300) return 'offline'; // 5 mins
        if (p.status === 'away' || diff > 60) return 'away'; // 1 min or explicit away
        return 'online';
    };



    // ── Render ────────────────────────────────────────────────────────

    if (authLoading || (session && peersLoading)) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-4 text-muted-foreground animate-pulse">
                <Bot className="w-8 h-8 opacity-50" />
                <p className="text-sm font-medium">Loading AEGIS Identity...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4 overflow-hidden">
            {!session && !authLoading && (
                <div className="flex-shrink-0 flex items-center justify-center p-6 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <LogIn className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-widest">Authenticated Access Required</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Posting to the AEGIS Shared Board requires a validated mission session.
                            </p>
                        </div>
                        <AuthPanel />
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Thread List */}
                <div className="w-64 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-lg">Threads</h2>
                        {/* Disable create if offline or loading */}
                        <Button variant="ghost" size="sm" onClick={createThread} disabled={!session || threadsLoading}>
                            <PlusCircle className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 border rounded-md p-2">
                        {threadsLoading ? (
                            <div className="flex flex-col items-center justify-center h-20 gap-2 text-muted-foreground">
                                <Bot className="w-4 h-4 animate-spin" />
                                <span className="text-xs">Loading threads...</span>
                            </div>
                        ) : threadsError ? (
                            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                                <p className="font-bold flex items-center gap-1">
                                    <Bot className="w-3 h-3" /> Error
                                </p>
                                <p className="mt-1 opacity-90">{threadsError}</p>
                            </div>
                        ) : threads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-center p-4 text-muted-foreground">
                                <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-xs font-medium">No threads yet</p>
                                {session && (
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-xs h-auto p-0 mt-1"
                                        onClick={createThread}
                                    >
                                        Create one?
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {threads.map((t) => (
                                    <Button
                                        key={t.id}
                                        variant={selectedThreadId === t.id ? 'secondary' : 'ghost'}
                                        className="w-full justify-start text-left"
                                        onClick={() => setSelectedThreadId(t.id)}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2 shrink-0" />
                                        <span className="truncate">{t.title}</span>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Identity / "Post As" Section */}
                    <div className="mt-auto pt-4 border-t space-y-2">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex justify-between">
                            Post As
                            {peersError && <span className="text-destructive font-bold text-[10px]">{peersError}</span>}
                        </div>

                        {/* Deterministic identity badge */}
                        <div className={cn(
                            "flex items-center gap-2 px-2.5 py-2 rounded-md border text-sm transition-colors",
                            session
                                ? "bg-primary/5 border-primary/20 text-foreground"
                                : "bg-muted/50 border-border/50 text-muted-foreground"
                        )}>
                            {session ? (
                                <>
                                    <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate font-medium text-xs">{currentIdentityLabel}</span>
                                </>
                            ) : (
                                <>
                                    <User className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                    <span className="truncate text-xs italic">Not signed in</span>
                                </>
                            )}
                        </div>

                        {/* Peer selector — only shown when peers exist */}
                        {peers.length > 0 && session && (
                            <select
                                title="Select Peer"
                                className="w-full bg-background border border-border/50 rounded p-1.5 text-xs disabled:opacity-50 focus:border-primary/50 transition-colors"
                                value={selectedPeerId || ''}
                                onChange={(e) => setSelectedPeerId(e.target.value)}
                            >
                                {peers.map(p => (
                                    <option key={p.id} value={p.id}>{p.display_name} ({p.peer_type})</option>
                                ))}
                            </select>
                        )}

                        {/* AI Simulator Panel (Dev-only) */}
                        {import.meta.env.DEV && (
                            <div className="mt-4 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Bot className="w-3 h-3" /> AI Simulator
                                </div>
                                <select
                                    title="AI Name"
                                    className="w-full bg-background border border-purple-500/20 rounded p-1 text-xs focus:border-purple-500/50"
                                    value={selectedSimPersonaId}
                                    onChange={(e) => setSelectedSimPersonaId(e.target.value)}
                                >
                                    {Object.values(PERSONA_PACK).map(p => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                                <Input
                                    placeholder="AI thought..."
                                    className="h-8 text-xs border-purple-500/20"
                                    value={simAIMessage}
                                    onChange={(e) => setSimAIMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && simulateAIMessage()}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-[10px] border-purple-500/40 hover:bg-purple-500/10 text-purple-600"
                                    onClick={simulateAIMessage}
                                    disabled={!simAIMessage.trim()}
                                >
                                    Simulate AI Post
                                </Button>

                                {/* AI Auto-Reply Section */}
                                <div className="pt-2 border-t border-purple-500/20 space-y-2">
                                    <div className="text-[9px] font-bold text-purple-400/60 uppercase flex items-center gap-1">
                                        <Bot className="w-2.5 h-2.5" /> AI Auto-Reply (Simulated)
                                    </div>
                                    <select
                                        title="Simulated Reply Mode"
                                        className="w-full bg-background border border-purple-500/20 rounded p-1 text-[10px] focus:border-purple-500/50"
                                        value={simAutoReplyMode}
                                        onChange={(e) => setSimAutoReplyMode(e.target.value)}
                                        disabled={isSequenceRunning}
                                    >
                                        <option value="Acknowledge + Ask">Acknowledge + Ask</option>
                                        <option value="Summarize last 3">Summarize last 3</option>
                                        <option value="Suggest next steps">Suggest next steps</option>
                                        <option value="Challenge assumption">Challenge assumption</option>
                                        <option value="Governance lens">Governance lens</option>
                                    </select>
                                    <div className="grid grid-cols-2 gap-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[9px] border-purple-500/30 text-purple-600 px-1"
                                            onClick={handleAutoReplyOnce}
                                            disabled={!selectedThreadId || isSequenceRunning || cooldownRemaining > 0 || messages.length === 0}
                                        >
                                            Reply Once
                                        </Button>
                                        {isSequenceRunning ? (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="h-7 text-[9px] px-1"
                                                onClick={stopSequence}
                                            >
                                                Stop
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[9px] border-purple-500/30 text-purple-600 px-1"
                                                onClick={handleAutoReplySequence}
                                                disabled={!selectedThreadId || cooldownRemaining > 0 || messages.length === 0}
                                            >
                                                Stress Test x3 {cooldownRemaining > 0 ? `(${cooldownRemaining}s)` : ''}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Part 4: Dev Ops Diagnostics */}
                                <div className="pt-2 border-t border-purple-500/20">
                                    <div className="text-[9px] font-bold text-purple-400/60 uppercase mb-1 flex items-center gap-1">
                                        <Shield className="w-2.5 h-2.5" /> Recent Simulated Ops
                                    </div>
                                    <div className="space-y-1">
                                        {ops.filter((o) => o.proposal.toolId === 'ai.simulate_message' || o.proposal.toolId === 'ai.auto_reply')
                                            .sort((a, b) => b.createdAt - a.createdAt)
                                            .slice(0, 5)
                                            .map((o) => (
                                                <div key={o.id} className="text-[8px] font-mono text-purple-300/50 truncate">
                                                    [{new Date(o.createdAt).toLocaleTimeString([], { hour12: false })}] {o.id.slice(0, 8)}.. | {(o.result?.data as { simulatedAiLabel?: string; personaLabel?: string })?.simulatedAiLabel || (o.result?.data as { personaLabel?: string })?.personaLabel || o.proposal.toolName}
                                                </div>
                                            ))
                                        }
                                        {ops.filter((o) => o.proposal.toolId === 'ai.simulate_message' || o.proposal.toolId === 'ai.auto_reply').length === 0 && (
                                            <div className="text-[8px] italic text-purple-400/30">No simulation ops recorded</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={sharePresence}
                                    onChange={(e) => setSharePresence(e.target.checked)}
                                    className="w-3 h-3 rounded border-border"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-tight font-medium">
                                    Share Presence
                                </span>
                            </label>
                            <p className="text-[9px] text-muted-foreground/60 leading-tight mt-1">
                                Presence uses last_seen timestamps while active.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Message Stream */}
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="border-b px-4 py-3 shrink-0">
                        <CardTitle className="text-base flex items-center justify-between">
                            {threads.find(t => t.id === selectedThreadId)?.title || 'Select a thread'}
                            {messagesLoading && <Bot className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0 flex flex-col relative">
                        <div
                            className="flex-1 overflow-y-auto p-4 space-y-4"
                            ref={scrollRef}
                            onScroll={handleScroll}
                        >
                            {messagesLoading && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                    <Bot className="w-8 h-8 animate-spin mb-2" />
                                    <p className="text-xs">Loading messages...</p>
                                </div>
                            )}

                            {messagesError && (
                                <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-center text-sm">
                                    <p className="font-bold">Error loading messages</p>
                                    <p className="text-xs mt-1 opacity-90">{messagesError}</p>
                                </div>
                            )}

                            {!messagesLoading && !messagesError && messages.length === 0 && selectedThreadId && (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30">
                                    <MessageSquare className="w-12 h-12 mb-2" />
                                    <p className="text-sm font-medium">No messages yet</p>
                                    <p className="text-xs">Start the conversation below</p>
                                </div>
                            )}

                            {!messagesError && messages.map((m) => {
                                const author = peers.find(p => p.id === m.author_peer_id);
                                let isAI = m.author_peer_type === 'ai';
                                let displayName = author?.display_name || 'Unknown';
                                const messageBody = m.body;

                                // Handle Simulated AI authorship
                                if (m.kind?.startsWith('ai_sim|') || m.kind?.startsWith('ai_auto|')) {
                                    isAI = true; // Force AI styling
                                    displayName = m.kind.split('|')[1] || 'AI';
                                }

                                const personaTheme = isAI ? (
                                    displayName.includes('Lumin') ? "bg-purple-100 text-purple-700 border-purple-200" :
                                        displayName.includes('Haven') ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                            displayName.includes('Shield') ? "bg-blue-100 text-blue-700 border-blue-200" :
                                                displayName.includes('Echo') ? "bg-amber-100 text-amber-700 border-amber-200" :
                                                    "bg-purple-100 text-purple-700 border-purple-200"
                                ) : "bg-blue-100 text-blue-700 border-blue-200";

                                return (
                                    <div key={m.id} className={cn("flex gap-3", isAI ? "flex-row-reverse" : "flex-row")}>
                                        <Avatar className="w-8 h-8 shrink-0">
                                            <AvatarFallback className={personaTheme.split(' border')[0]}>
                                                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={cn("flex flex-col max-w-[80%]", isAI ? "items-end" : "items-start")}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    getPresenceStatus(m.author_peer_id) === 'online' ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" :
                                                        getPresenceStatus(m.author_peer_id) === 'away' ? "bg-yellow-500" : "bg-muted-foreground/30"
                                                )} />
                                                <span className="text-xs font-bold flex items-center gap-1.5">
                                                    {displayName}
                                                    {isAI && <span className={cn(personaTheme, "text-[9px] px-1 rounded font-black tracking-tighter border")}>AI</span>}
                                                    {(m.kind?.startsWith('ai_sim|') || m.kind?.startsWith('ai_auto|')) && (
                                                        <span
                                                            className="text-[8px] text-muted-foreground/60 italic font-normal"
                                                            title={`Action by ${author?.display_name || 'unknown human'}`}
                                                        >
                                                            {m.kind.startsWith('ai_sim|') ? '(Simulated)' : '(Auto)'}
                                                        </span>
                                                    )}
                                                    {/* Part 3: Logged Indicator */}
                                                    {(m.kind?.startsWith('ai_sim|') || m.kind?.startsWith('ai_auto|')) &&
                                                        ops.some(o =>
                                                            (o.proposal.toolId === 'ai.simulate_message' || o.proposal.toolId === 'ai.auto_reply') &&
                                                            o.result?.data && (o.result.data as { messageId?: string }).messageId === m.id
                                                        ) && (
                                                            <span
                                                                className="flex items-center gap-0.5 text-[8px] bg-green-500/10 text-green-600 px-1 rounded border border-green-500/20"
                                                                title="Recorded in governance ledger"
                                                            >
                                                                <Shield className="w-2 h-2" /> Logged
                                                            </span>
                                                        )}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</span>
                                            </div>
                                            <div className={cn(
                                                "px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                                                isAI ? "bg-purple-600 text-white" : "bg-muted text-foreground"
                                            )}>
                                                {messageBody}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {!autoScroll && (
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="text-[10px] px-3 py-1.5 h-auto rounded-full shadow-lg border animate-in slide-in-from-bottom-2"
                                    onClick={() => setAutoScroll(true)}
                                >
                                    <PlusCircle className="w-3 h-3 mr-1.5" />
                                    New messages below
                                </Button>
                            </div>
                        )}


                        {/* Compose Box */}
                        <div className="p-4 border-t bg-muted/30 shrink-0">
                            {actionError && (
                                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mb-2 border border-destructive/20 animate-in slide-in-from-bottom-2 fade-in">
                                    <span className="font-bold">Error:</span> {actionError}
                                </div>
                            )}
                            {session ? (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        disabled={!selectedThreadId}
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        size="icon"
                                        disabled={!selectedThreadId || !newMessage.trim()}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-2 rounded bg-muted/50 border border-dashed border-border text-xs text-muted-foreground uppercase tracking-widest font-bold">
                                    Posting Locked — Authenticate to Participate
                                </div>
                            )
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dev Debug Footer (visible in DEV only) */}
            {import.meta.env.DEV && (
                <div className="text-[10px] text-muted-foreground/40 font-mono text-center pb-1">
                    DEV DEBUG: UID:{shortId(user?.id || '')} | Peer:{shortId(selectedPeerId || '')} | Type:{currentPeerType}
                </div>
            )}
        </div >
    );
}

