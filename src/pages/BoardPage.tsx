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

    const { proposeReadOnlyToolCall, recordResult } = useGovernedOperations('shared-board');
    const scrollRef = useRef<HTMLDivElement>(null);

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
            alert(`Failed to send message: ${message}`); // Simple UI feedback
            recordResult(opId, 'error', { error: message });
            // Optionally restore the message to input? (Complexity for Phase 1, skipping)
        }
    };

    useEffect(() => {
        fetchPeers();
        fetchThreads();
    }, [fetchPeers, fetchThreads]);

    useEffect(() => {
        if (selectedThreadId) {
            fetchMessages(selectedThreadId);
            const subscription = supabase
                .channel(`thread-${selectedThreadId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `thread_id=eq.${selectedThreadId}`
                }, (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [selectedThreadId, fetchMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Actions ──────────────────────────────────────────────────────

    const createThread = async () => {
        if (!session || !user) return;
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
            alert(`Failed to create thread: ${error.message}`);
            return;
        }

        if (data) {
            setThreads((prev) => [data, ...prev]);
            setSelectedThreadId(data.id);
        }
    };



    // ── Render ────────────────────────────────────────────────────────

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
                        <Button variant="ghost" size="sm" onClick={createThread} disabled={!session}>
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
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Post As</div>

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
                                const isAI = m.author_peer_type === 'ai';

                                return (
                                    <div key={m.id} className={cn("flex gap-3", isAI ? "flex-row-reverse" : "flex-row")}>
                                        <Avatar className="w-8 h-8 shrink-0">
                                            <AvatarFallback className={isAI ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                                                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={cn("flex flex-col max-w-[80%]", isAI ? "items-end" : "items-start")}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold">{author?.display_name || 'Unknown'}</span>
                                                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString()}</span>
                                            </div>
                                            <div className={cn(
                                                "px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                                                isAI ? "bg-purple-600 text-white" : "bg-muted text-foreground"
                                            )}>
                                                {m.body}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                        {/* Compose Box */}
                        <div className="p-4 border-t bg-muted/30 shrink-0">
                            {session ? (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    />
                                    <Button onClick={sendMessage} size="icon">
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
        </div >
    );
}

