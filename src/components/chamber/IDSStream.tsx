import { useState } from 'react';
import { Send, Hash, MessageSquare, Lightbulb, FileText, MoreHorizontal, Activity, Link, X } from 'lucide-react';
import { type IDSCard } from '../../types';
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
    nodes: NodeOption[];
    onAttach: (cardId: string, nodeId: string) => void;
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
    nodes,
    onAttach,
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
        <div className="h-full flex flex-col bg-card">
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
                            className="h-6 w-6 p-0 hover:bg-muted"
                            onClick={onBeginNewChat}
                            title="Begin New Chat"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Feed Area */}
            {showFeed && (
                <div className={cn(
                    "flex-1 p-4 flex gap-4 bg-slate-50/50 dark:bg-slate-900/50 min-h-0",
                    layout === 'horizontal' ? "flex-row overflow-x-auto overflow-y-auto items-start" : "flex-col overflow-y-auto items-stretch"
                )}>
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className={cn(
                                "flex-shrink-0 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 flex flex-col gap-2 group",
                                layout === 'horizontal' ? "w-80" : "w-full"
                            )}
                        >
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5 uppercase font-medium tracking-wide">
                                    {getIconForType(card.type)}
                                    {card.type}
                                </div>
                                <span>{card.timestamp}</span>
                            </div>
                            <p className="text-sm line-clamp-3 leading-relaxed">
                                {card.content}
                            </p>

                            {/* Attachment Badges */}
                            {card.attachments && card.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {card.attachments.map((att) => (
                                        <button
                                            key={att.id}
                                            onClick={() => onFocusNode(att.targetId)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium hover:bg-primary/20 transition-colors"
                                        >
                                            <Link className="w-3 h-3" />
                                            {att.label}
                                            <span
                                                role="button"
                                                aria-label={`Remove attachment: ${att.label}`}
                                                title="Remove attachment"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveAttachment(card.id, att.id);
                                                }}
                                                className="ml-0.5 hover:text-destructive transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-auto pt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center border-2 border-card">
                                        {card.authorId.slice(0, 2).toUpperCase()}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="h-6 px-2 text-xs gap-1"
                                    onClick={() => setAttachingCardId(card.id)}
                                >
                                    <Link className="w-3 h-3" />
                                    Attach
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Composer Area */}
            {showComposer && (
                <div className="p-4 bg-card border-t border-border flex-shrink-0">
                    <div className="flex gap-2 mb-2">
                        {(['identification', 'definition', 'suggestion'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-full border transition-colors capitalize",
                                    activeTab === tab
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                )}
                            >
                                {tab === 'identification' ? 'identify' : tab === 'definition' ? 'define' : 'suggest'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Textarea
                            placeholder={`Type to add a ${activeTab}...`}
                            value={inputText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
                            className="resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            className="h-auto w-12 flex-col gap-1"
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
