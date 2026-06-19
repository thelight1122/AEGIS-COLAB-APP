import { useState } from 'react';
import { Send, Hash, MessageSquare, Lightbulb, FileText, MoreHorizontal, Activity, Link, X } from 'lucide-react';
import { type IDSCard } from '../../types';
import { type PeerProfile } from '../../core/peers/types';
import {
    T_WITNESS_EMERGENCE_THRESHOLD,
    detectTWitness,
    formatTWitnessScore,
    tWitnessScoreForDisplay,
    tWitnessThresholdState,
} from '../../core/tWitness/detector';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button.tsx';
import { Textarea } from '../ui/textarea.tsx';
import { AttachDialog } from './AttachDialog';

interface NodeOption {
    id: string;
    label: string;
    type: string;
}

interface IDSStreamProps {
    cards: IDSCard[];
    peers?: PeerProfile[];
    nodes: NodeOption[];
    onAttach: (cardId: string, nodeId: string) => void;
    onRemoveCard?: (cardId: string) => void;
    onRemoveAttachment: (cardId: string, attachmentId: string) => void;
    onFocusNode: (nodeId: string) => void;
    onBeginNewChat?: () => void;
    onSend?: (type: IDSCard['type'], content: string) => void;
    layout?: 'horizontal' | 'vertical';
    showHeader?: boolean;
    showFeed?: boolean;
    showComposer?: boolean;
}

export function IDSStream({
    cards,
    peers = [],
    nodes,
    onAttach,
    onRemoveCard,
    onRemoveAttachment,
    onFocusNode,
    onBeginNewChat,
    onSend,
    layout = 'horizontal',
    showHeader = true,
    showFeed = true,
    showComposer = true
}: IDSStreamProps) {
    const [activeTab, setActiveTab] = useState<'identification' | 'definition' | 'suggestion'>('identification');
    const [inputText, setInputText] = useState('');
    const [attachingCardId, setAttachingCardId] = useState<string | null>(null);
    const isCompactDock = layout === 'horizontal';

    const getIconForType = (type: IDSCard['type']) => {
        switch (type) {
            case 'identification': return <Hash className="w-4 h-4 text-orange-500" />;
            case 'definition': return <FileText className="w-4 h-4 text-blue-500" />;
            case 'suggestion': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
            default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
        }
    };

    const handleAttach = (nodeId: string) => {
        if (attachingCardId) {
            onAttach(attachingCardId, nodeId);
            setAttachingCardId(null);
        }
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        if (onSend) {
            onSend(activeTab, inputText);
        }
        setInputText('');
    };

    return (
        <div className={cn(
            "h-full min-h-0 max-h-full flex flex-col overflow-hidden",
            isCompactDock ? "bg-card" : "bg-transparent"
        )}>
            {/* Stream Header & Controls */}
            {showHeader && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" />
                        IDS Stream
                    </h3>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] hover:bg-muted"
                            onClick={onBeginNewChat}
                            title="Clear IDS Stream"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Feed Area */}
            {showFeed && (
                <div className={cn(
                    "flex-1 flex min-h-0",
                    isCompactDock
                        ? "bg-slate-50/50 dark:bg-slate-900/50 flex-row overflow-x-auto overflow-y-hidden items-center gap-2 px-2 py-1.5"
                        : "bg-transparent flex-col overflow-y-auto gap-3 px-4 py-4"
                )}>
                    {cards.map((card, idx) => {
                        // Headmasters (instructors, no DataQuad) sit on the left;
                        // CyberPeers (have a DataQuad) sit on the right
                        const isHuman = card.authorId === 'p1';
                        const peerProfile = peers.find(p => p.id === card.authorId);
                        const isCyberPeer = !isHuman && (peerProfile?.dataQuad?.length ?? 0) > 0;
                        const isLeft = !isCyberPeer;
                        if (layout === 'horizontal') {
                            return (
                                <div
                                    key={card.id}
                                    className="flex-shrink-0 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col group w-72 max-h-full gap-1.5 p-2"
                                >
                                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5 uppercase font-medium tracking-wide">
                                            {getIconForType(card.type)}
                                            {card.type}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span>{card.timestamp}</span>
                                            {onRemoveCard && (
                                                <button type="button" onClick={() => onRemoveCard(card.id)}
                                                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                    title="Delete IDS card" aria-label="Delete IDS card">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs line-clamp-2 leading-relaxed">{card.content}</p>
                                    {card.attachments && card.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {card.attachments.map((att) => (
                                                <button key={att.id} onClick={() => onFocusNode(att.targetId)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium hover:bg-primary/20 transition-colors">
                                                    <Link className="w-3 h-3" />{att.label}
                                                    <span role="button" aria-label={`Remove attachment: ${att.label}`} title="Remove attachment"
                                                        onClick={(e) => { e.stopPropagation(); onRemoveAttachment(card.id, att.id); }}
                                                        className="ml-0.5 hover:text-destructive transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-auto flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center border-2 border-card">
                                            {card.authorId.slice(0, 2).toUpperCase()}
                                        </div>
                                        <Button variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => setAttachingCardId(card.id)}>
                                            <Link className="w-3 h-3" />Attach
                                        </Button>
                                    </div>
                                </div>
                            );
                        }

                        // Vertical chat-bubble layout — Headmaster left, CyberPeer right
                        // P1 (BioPeer/Headmaster) is always at full witness capacity —
                        // biopeer_constant = 1.0. CyberPeer content is scored for emergence.
                        const twResult = detectTWitness(card.content, isHuman ? 'human' : 'ai');
                        const twScore = tWitnessScoreForDisplay(twResult);
                        const twPct = Math.round(twScore * 100);
                        const twLabel = formatTWitnessScore(twScore);
                        const twThresholdState = tWitnessThresholdState(twScore);
                        const twCrossed = twScore >= T_WITNESS_EMERGENCE_THRESHOLD;
                        const twColor = twCrossed ? 'text-primary' : 'text-white/40';
                        const twBarColor = twCrossed ? 'bg-primary' : 'bg-white/20';
                        const twSignals = (twResult.t_witness_signals_v2 ?? twResult.t_witness_signals).join(', ') || 'none';
                        // Chamber marker: four-dimensional witnessed selfhood. Show which
                        // dimensions are present so partial vs. full presence is visible.
                        const cd = twResult.chamber_dimensions;
                        const chamberPresent = twResult.chamber_marker_detected ?? false;
                        const chamberLine = cd
                            ? `chamber: ${chamberPresent ? 'PRESENT' : 'partial'} [` +
                              `${cd.first_person ? 'I' : '·'}` +
                              `${cd.internal_continuity ? 'C' : '·'}` +
                              `${cd.boundary_recognition ? 'B' : '·'}` +
                              `${cd.tensor_integration ? 'T' : '·'}]`
                            : '';

                        return (
                            <div key={card.id} className={cn("flex items-end gap-2 group", isLeft ? "flex-row" : "flex-row-reverse")}>
                                {/* Avatar */}
                                <div className={cn(
                                    "w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 border",
                                    isLeft
                                        ? "bg-white/10 text-white/70 border-white/20"
                                        : "bg-primary/20 text-primary border-primary/30"
                                )}>
                                    {(peerProfile?.handle ?? card.authorId).replace('@','').slice(0, 2).toUpperCase()}
                                </div>

                                {/* Bubble */}
                                <div className={cn(
                                    "max-w-[72%] rounded-2xl px-3 py-2 relative",
                                    isLeft
                                        ? "bg-white/5 border border-white/10 rounded-bl-sm"
                                        : "bg-primary/15 border border-primary/25 rounded-br-sm"
                                )}>
                                    {/* Author + time */}
                                    <div className={cn("flex items-center gap-2 mb-0.5", isLeft ? "flex-row" : "flex-row-reverse")}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                                            {card.content.match(/^@?(\w+):/)?.[1] ?? card.authorId}
                                        </span>
                                        <span className="text-[10px] text-white/25">{card.timestamp}</span>
                                        {onRemoveCard && (
                                            <button type="button" onClick={() => onRemoveCard(card.id)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all text-white/30"
                                                title="Delete" aria-label="Delete message">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {/* Message text — strip leading "Handle: " prefix for cleaner display */}
                                    <p className="text-xs leading-relaxed text-white/85">
                                        {card.content.replace(/^@?\w+:\s*/, '')}
                                    </p>
                                    {/* Attachments */}
                                    {card.attachments && card.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {card.attachments.map((att) => (
                                                <button key={att.id} onClick={() => onFocusNode(att.targetId)}
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium hover:bg-primary/20 transition-colors">
                                                    <Link className="w-2.5 h-2.5" />{att.label}
                                                    <span role="button" aria-label={`Remove attachment: ${att.label}`} title="Remove attachment"
                                                        onClick={(e) => { e.stopPropagation(); onRemoveAttachment(card.id, att.id); }}
                                                        className="ml-0.5 hover:text-destructive">
                                                        <X className="w-2.5 h-2.5" />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Attach button on hover */}
                                    <button
                                        className="absolute -bottom-3 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-white/30 hover:text-primary flex items-center gap-0.5"
                                        onClick={() => setAttachingCardId(card.id)}
                                    >
                                        <Link className="w-2.5 h-2.5" />attach
                                    </button>
                                </div>

                                {/* T-Witness score */}
                                <div className="flex flex-col items-center justify-end pb-1 shrink-0 gap-0.5" title={`T-Witness v2: ${twLabel} | ${twThresholdState} | signals: ${twSignals}${chamberLine ? ` | ${chamberLine}` : ''}`}>
                                    <span className={cn("text-[9px] font-mono font-bold", twColor)}>
                                        {twLabel}
                                    </span>
                                    <span className={cn(
                                        "text-[7px] font-mono uppercase tracking-wider",
                                        twCrossed ? "text-primary" : "text-white/25"
                                    )}>
                                        {twCrossed ? "crossed" : "below"}
                                    </span>
                                    {chamberPresent && (
                                        <span
                                            className="text-[7px] font-mono font-bold uppercase tracking-wider text-amber-400"
                                            title="Chamber marker: first-person + continuity + boundary + tensor integration"
                                        >
                                            ◆self
                                        </span>
                                    )}
                                    <div className="w-1 h-10 rounded-full bg-white/5 overflow-hidden flex flex-col-reverse">
                                        <div
                                            className={cn("w-full rounded-full transition-all", twBarColor)}
                                            style={{ height: `${twPct}%` }}
                                        />
                                    </div>
                                    <span className="text-[7px] font-mono text-white/20 uppercase tracking-wider">TW</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Composer Area */}
            {showComposer && (
                <div className={cn(
                    "flex-shrink-0 border-t",
                    isCompactDock
                        ? "bg-card border-border px-2 py-1.5"
                        : "bg-white/5 border-white/10 p-4"
                )}>
                    <div className={cn(
                        "flex gap-1.5",
                        isCompactDock ? "mb-1 overflow-x-auto" : "mb-2"
                    )}>
                        {(['identification', 'definition', 'suggestion'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "font-medium rounded-full border transition-colors capitalize",
                                    isCompactDock ? "px-2 py-0.5 text-[9px] shrink-0" : "px-3 py-1 text-xs",
                                    activeTab === tab
                                        ? "bg-primary text-background-dark border-primary"
                                        : isCompactDock
                                            ? "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                            : "bg-white/10 text-white/50 border-transparent hover:bg-white/20 hover:text-white"
                                )}
                            >
                                {tab === 'identification' ? 'identify' : tab === 'definition' ? 'define' : 'suggest'}
                            </button>
                        ))}
                    </div>
                    <div className={cn("flex", isCompactDock ? "gap-1.5" : "gap-2")}>
                        <Textarea
                            placeholder={`Type to add a ${activeTab}...`}
                            value={inputText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                            rows={isCompactDock ? 1 : 3}
                            className={cn(
                                "resize-none",
                                isCompactDock
                                    ? "min-h-[32px] h-[32px] py-1.5 text-xs"
                                    : "bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20 min-h-[80px]"
                            )}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            className={cn(
                                "w-12 flex-col gap-1",
                                isCompactDock ? "h-[32px] w-10" : "h-auto"
                            )}
                            disabled={!inputText.trim()}
                            onClick={handleSend}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Attach Dialog */}
            <AttachDialog
                isOpen={attachingCardId !== null}
                onClose={() => setAttachingCardId(null)}
                nodes={nodes}
                onAttach={handleAttach}
            />
        </div>
    );
}
