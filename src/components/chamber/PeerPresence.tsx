import { useState } from 'react';
import { Search, User, Bot, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import { type Peer } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface PeerPresenceProps {
    peers: Peer[];
    onAcknowledge: (peerId: string) => void;
}

export function PeerPresence({ peers, onAcknowledge }: PeerPresenceProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

    const filteredPeers = peers.filter(peer =>
        peer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        peer.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const acknowledgedCount = peers.filter((p) => p.acknowledged).length;

    return (
        <div className="h-full flex flex-col bg-card border-r border-border">
            <div className="p-4 border-b border-border space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Presence ({peers.length})</span>
                    <span className="text-[10px] font-normal text-green-600 dark:text-green-400">
                        {acknowledgedCount}/{peers.length} ack
                    </span>
                </h3>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Filter peers..."
                        className="w-full bg-muted/50 border border-border rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredPeers.map((peer) => (
                    <div
                        key={peer.id}
                        onClick={() => setSelectedPeerId(peer.id)}
                        className={cn(
                            "p-3 rounded-md cursor-pointer transition-all border border-transparent hover:bg-muted/50",
                            selectedPeerId === peer.id ? "bg-accent border-primary/20 shadow-sm" : ""
                        )}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "p-1.5 rounded-full",
                                    peer.type === 'ai' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                )}>
                                    {peer.type === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                </div>
                                <span className="font-medium text-sm">{peer.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {peer.acknowledged && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                )}
                                {peer.status === 'online' ? (
                                    <Wifi className="w-3.5 h-3.5 text-green-500" />
                                ) : peer.status === 'busy' ? (
                                    <Wifi className="w-3.5 h-3.5 text-yellow-500" />
                                ) : (
                                    <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pl-8">
                            <span className="text-xs text-muted-foreground">{peer.role}</span>
                            <div className="flex items-center gap-2">
                                {peer.matchScore && (
                                    <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        {peer.matchScore}%
                                    </span>
                                )}
                                {!peer.acknowledged && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-2 text-[10px]"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAcknowledge(peer.id);
                                        }}
                                    >
                                        Acknowledge
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
