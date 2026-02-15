import { useState, useCallback, useMemo } from 'react';
import { PeerPresence } from './PeerPresence';
import { TelemetryPanel } from './TelemetryPanel';
import { WhiteboardArea } from './WhiteboardArea';
import { Tag, Edit2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useIDS } from '../../contexts/IDSContext';
import { MOCK_PEERS, MOCK_TELEMETRY, type Peer, type TelemetryData } from '../../types';
import { IDSStream } from './IDSStream';

export function ChamberLayout() {
    const {
        focusNodeId,
        setNodes,
        canvasNodes,
        addCard,
        attachNode,
        removeAttachment,
        setFocusNode
    } = useIDS();

    // Inclusion State (BM-05)
    const [peers, setPeers] = useState<Peer[]>(MOCK_PEERS);
    const [artifactMetadata, setArtifactMetadata] = useState({
        title: 'Operational Layer — Prism Refract Behavior',
        domains: ['Operational Layer', 'Canon Integrity']
    });
    const [isEditingMetadata, setIsEditingMetadata] = useState(false);
    const [tempMetadata, setTempMetadata] = useState(artifactMetadata);

    // Derived State: Domains & Intersections (GI-001)
    const relevantPeers = useMemo(() => {
        return peers.filter(p => p.domains.some(d => artifactMetadata.domains.includes(d)));
    }, [peers, artifactMetadata.domains]);

    const activeLenses = useMemo(() => {
        // In a real app, we'd fetch actual Lens definitions.
        // For now, we derive status from the artifact domains.
        return MOCK_TELEMETRY.lenses.filter(l =>
            l.domains.some(d => artifactMetadata.domains.includes(d))
        );
    }, [artifactMetadata.domains]);

    const [lensStatuses, setLensStatuses] = useState<Record<string, 'active' | 'missing' | 'deferred'>>({});

    // Telemetry Data (Pure Derivation)
    const telemetry = useMemo((): TelemetryData => {
        const ackCount = relevantPeers.filter(p => p.acknowledged).length;
        const total = relevantPeers.length || 1;
        const inclusionScore = Math.round((ackCount / total) * 100);

        const lenses = activeLenses.map(al => ({
            ...al,
            status: lensStatuses[al.name] || al.status
        }));

        const coveredCount = lenses.filter(l => l.status === 'active' || l.status === 'deferred').length;
        const totalLenses = lenses.length || 1;
        const lockAvailable = (inclusionScore >= 80) && (coveredCount === totalLenses);

        return {
            inclusionScore,
            drift: 12, // Standard drift
            convergence: 45,
            lenses,
            lockAvailable,
            activeDomains: artifactMetadata.domains
        };
    }, [relevantPeers, artifactMetadata.domains, activeLenses, lensStatuses]);

    // --- Canvas callbacks ---
    const handleNodesReady = useCallback((nodes: { id: string; label: string; type: string }[]) => {
        setNodes(nodes);
    }, [setNodes]);

    // --- IDS callbacks replaced by Context ---

    // --- Inclusion callbacks ---
    const handleAcknowledge = useCallback((peerId: string) => {
        setPeers((prev) =>
            prev.map((p) =>
                p.id === peerId ? { ...p, acknowledged: true } : p
            )
        );
    }, []);

    const handleInvokeLens = useCallback((lensName: string) => {
        setLensStatuses(prev => ({ ...prev, [lensName]: 'active' }));
    }, []);

    const handleDeferLens = useCallback((lensName: string) => {
        setLensStatuses(prev => ({ ...prev, [lensName]: 'deferred' }));
    }, []);

    const handleLockVersion = useCallback(() => {
        alert(`🔒 Version Locked: "${artifactMetadata.title}"\nCoherence state has been captured with ${telemetry.inclusionScore}% inclusion.`);
    }, [artifactMetadata.title, telemetry.inclusionScore]);

    const saveMetadata = () => {
        setArtifactMetadata(tempMetadata);
        setIsEditingMetadata(false);
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Governance Header (GI-001) */}
            <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-6 z-30 backdrop-blur-sm">
                <div className="flex items-center gap-4 flex-1">
                    {isEditingMetadata ? (
                        <div className="flex items-center gap-2 flex-1 max-w-2xl">
                            <input
                                className="bg-muted border border-border rounded px-3 py-1 text-sm flex-1 font-semibold"
                                value={tempMetadata.title}
                                aria-label="Artifact Title"
                                placeholder="Artifact Title"
                                onChange={(e) => setTempMetadata(prev => ({ ...prev, title: e.target.value }))}
                            />
                            <input
                                className="bg-muted border border-border rounded px-3 py-1 text-xs w-64"
                                value={tempMetadata.domains.join(', ')}
                                aria-label="Target Domains"
                                onChange={(e) => setTempMetadata(prev => ({ ...prev, domains: e.target.value.split(',').map(d => d.trim()).filter(Boolean) }))}
                                placeholder="Domains (comma separated)"
                            />
                            <Button size="sm" onClick={saveMetadata} title="Save Metadata" className="h-8 w-8 p-0">
                                <Check className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    {artifactMetadata.title}
                                    <button
                                        onClick={() => { setTempMetadata(artifactMetadata); setIsEditingMetadata(true); }}
                                        className="text-muted-foreground hover:text-primary"
                                        title="Edit Metadata"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </h2>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Tag className="w-3 h-3 text-muted-foreground" />
                                    {artifactMetadata.domains.map(d => (
                                        <span key={d} className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        Governance Integrity v1.0
                    </div>
                </div>
            </div>

            {/* Main Content Area: Left, Center, Right */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Left Rail: Peer Presence */}
                <div className="w-64 flex-shrink-0 z-10 shadow-xl shadow-black/5">
                    <PeerPresence
                        peers={relevantPeers}
                        onAcknowledge={handleAcknowledge}
                    />
                </div>

                {/* Center: Whiteboard */}
                <div className="flex-1 relative min-w-0 z-0">
                    <WhiteboardArea
                        focusNodeId={focusNodeId}
                        onNodesReady={handleNodesReady}
                    />
                </div>

                {/* Right Rail: Telemetry */}
                <div className="w-72 flex-shrink-0 z-10 shadow-xl shadow-black/5 border-l border-border bg-card">
                    <TelemetryPanel
                        telemetry={telemetry}
                        peers={peers}
                        onInvokeLens={handleInvokeLens}
                        onDeferLens={handleDeferLens}
                        onLockVersion={handleLockVersion}
                    />
                </div>
            </div>

            {/* IDS Input Rail */}
            <div className="h-44 border-t border-border bg-card flex-shrink-0">
                <IDSStream
                    cards={[]}
                    nodes={canvasNodes}
                    onAttach={attachNode}
                    onRemoveAttachment={removeAttachment}
                    onFocusNode={setFocusNode}
                    onSend={addCard}
                    showFeed={false}
                    showHeader={true}
                    showComposer={true}
                />
            </div>
        </div>
    );
}
