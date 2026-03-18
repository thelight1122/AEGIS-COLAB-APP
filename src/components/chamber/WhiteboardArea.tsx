import { useCallback, useState, useEffect, useRef } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    useReactFlow,
    ReactFlowProvider,
    type OnConnect,
    type Connection,
    type Edge,
    type NodeTypes,
    BackgroundVariant,
    Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';

import { ProposalNode } from './nodes/ProposalNode';
import { TensionNode } from './nodes/TensionNode';
import { ScenarioNode, BoundaryNode } from './nodes/StructureNodes';
import { ImageNode } from './nodes/ImageNode';
import { AgentNode } from './nodes/AgentNode';
import { DecisionNode } from './nodes/DecisionNode';
import type { AppNode } from './nodes/nodeTypes';
import { CreateNodeModal } from './CreateNodeModal';
import type { CreateNodeData } from './CreateNodeModal';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { Button } from '../ui/button';

const nodeTypes: NodeTypes = {
    proposal: ProposalNode,
    tension: TensionNode,
    scenario: ScenarioNode,
    boundary: BoundaryNode,
    image: ImageNode,
    agent: AgentNode,
    decision: DecisionNode,
};

const initialNodes: AppNode[] = [
    {
        id: '1',
        type: 'proposal',
        position: { x: 250, y: 100 },
        data: {
            label: 'Implement RAG Pipeline',
            description: 'Connect vector DB to improved context window',
            author: 'Architect'
        },
    },
    {
        id: '2',
        type: 'tension',
        position: { x: 100, y: 300 },
        data: {
            label: 'Latency Concerns',
            description: 'Vector search adding 200ms overhead',
            intensity: 'medium'
        },
    },
    {
        id: '3',
        type: 'scenario',
        position: { x: 500, y: 200 },
        data: {
            label: 'Q4 Deployment',
            active: true
        },
    },
    {
        id: '4',
        type: 'boundary',
        position: { x: 400, y: 50 },
        data: {
            label: 'Infrastructure Scope',
        },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true },
];

interface WhiteboardAreaProps {
    focusNodeId?: string | null;
    onNodesReady?: (nodes: { id: string; label: string; type: string }[]) => void;
}

function WhiteboardCanvas({ focusNodeId, onNodesReady }: WhiteboardAreaProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createNodeType, setCreateNodeType] = useState<CreateNodeData['type']>('proposal');
    const [nodeToEdit, setNodeToEdit] = useState<AppNode | null>(null);
    const { fitView } = useReactFlow();
    const prevFocusRef = useRef<string | null>(null);

    // Expose node list to parent
    useEffect(() => {
        if (onNodesReady) {
            const nodeList = nodes.map((n) => ({
                id: n.id,
                label: n.data.label || n.type || 'node',
                type: n.type || 'unknown',
            }));
            onNodesReady(nodeList);
        }
    }, [nodes, onNodesReady]);

    // Focus on a specific node when focusNodeId changes
    useEffect(() => {
        if (focusNodeId && focusNodeId !== prevFocusRef.current) {
            prevFocusRef.current = focusNodeId;
            // Highlight the node by selecting it
            setNodes((nds) =>
                nds.map((n) => ({ ...n, selected: n.id === focusNodeId }))
            );
            // Zoom to the node
            setTimeout(() => {
                fitView({ nodes: [{ id: focusNodeId }], duration: 600, padding: 0.5 });
            }, 50);
        }
    }, [focusNodeId, fitView, setNodes]);

    const onConnect: OnConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const handleCreateNode = (nodeData: CreateNodeData) => {
        if (nodeToEdit) {
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === nodeToEdit.id
                        ? {
                              ...n,
                              type: nodeData.type,
                              data: {
                                  ...n.data,
                                  label: nodeData.label,
                                  description: nodeData.description,
                                  intensity: nodeData.intensity,
                                  imageUrl: nodeData.imageUrl,
                                  role: nodeData.role,
                                  status: nodeData.status,
                                  state: nodeData.state,
                                  details: nodeData.details,
                              } as any, // Cast to avoid strict type mismatch during dynamic update
                          }
                        : n
                )
            );
            setIsCreateModalOpen(false);
            setNodeToEdit(null);
            return;
        }

        const id = `node-${Date.now()}`;
        let newNode: AppNode;

        const common = {
            id,
            position: { x: Math.random() * 500, y: Math.random() * 500 },
        };

        switch (nodeData.type) {
            case 'proposal':
                newNode = { ...common, type: 'proposal', data: { label: nodeData.label, description: nodeData.description, author: nodeData.author || 'User' } };
                break;
            case 'tension':
                newNode = { ...common, type: 'tension', data: { label: nodeData.label, description: nodeData.description, intensity: nodeData.intensity || 'medium' } };
                break;
            case 'scenario':
                newNode = { ...common, type: 'scenario', data: { label: nodeData.label, active: nodeData.active ?? false } };
                break;
            case 'boundary':
                newNode = { ...common, type: 'boundary', data: { label: nodeData.label } };
                break;
            case 'image':
                newNode = { ...common, type: 'image', data: { label: nodeData.label, imageUrl: nodeData.imageUrl, alt: nodeData.alt } };
                break;
            case 'agent':
                newNode = { ...common, type: 'agent', data: { label: nodeData.label, role: nodeData.role, status: nodeData.status || 'idle' } };
                break;
            case 'decision':
                newNode = { ...common, type: 'decision', data: { label: nodeData.label, state: nodeData.state || 'pending', details: nodeData.details } };
                break;
            default:
                return; // Should not happen with typed input
        }

        setNodes((nds) => nds.concat(newNode));
        setIsCreateModalOpen(false);
    };

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeDoubleClick={(_event, node) => {
                setNodeToEdit(node as AppNode);
                setCreateNodeType(node.type as CreateNodeData['type']);
                setIsCreateModalOpen(true);
            }}
            fitView
            className="bg-slate-50 dark:bg-slate-900"
        >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap className="dark:bg-slate-800 dark:border-slate-700" />
            <Panel position="top-left" className="top-1/4">
                <WhiteboardToolbar onSelectItem={(type) => {
                    setCreateNodeType(type);
                    setIsCreateModalOpen(true);
                }} />
            </Panel>
            <Panel position="top-right" className="flex gap-2">
                <Button onClick={() => {
                    const flow = { nodes, edges };
                    localStorage.setItem('aegis_canvas_backup', JSON.stringify(flow));
                    alert('Canvas layout saved to local storage.');
                }} variant="outline" className="gap-2 shadow-sm bg-slate-800 text-white hover:bg-slate-700">
                    Save Pipeline
                </Button>
                <Button onClick={() => {
                    const saved = localStorage.getItem('aegis_canvas_backup');
                    if (saved) {
                        try {
                            const flow = JSON.parse(saved);
                            if (flow.nodes) setNodes(flow.nodes);
                            if (flow.edges) setEdges(flow.edges);
                        } catch (e) {
                            console.error('Failed to load canvas', e);
                        }
                    } else {
                        alert('No saved canvas found.');
                    }
                }} variant="outline" className="gap-2 shadow-sm bg-slate-800 text-white hover:bg-slate-700">
                    Load Pipeline
                </Button>
                <Button onClick={() => {
                    setNodeToEdit(null);
                    setCreateNodeType('proposal');
                    setIsCreateModalOpen(true);
                }} className="gap-2 shadow-lg">
                    <Plus className="w-4 h-4" />
                    Add Node
                </Button>
            </Panel>
            <CreateNodeModal
                key={nodeToEdit ? `edit-${nodeToEdit.id}` : `new-${createNodeType}`}
                isOpen={isCreateModalOpen}
                mode={nodeToEdit ? 'edit' : 'create'}
                initialData={nodeToEdit ? (nodeToEdit.data as any) : undefined}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setNodeToEdit(null);
                }}
                onCreateNode={handleCreateNode}
                defaultType={createNodeType}
            />
        </ReactFlow>
    );
}

export function WhiteboardArea({ focusNodeId, onNodesReady }: WhiteboardAreaProps) {
    return (
        <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900/50 overflow-hidden group">
            <ReactFlowProvider>
                <WhiteboardCanvas focusNodeId={focusNodeId} onNodesReady={onNodesReady} />
            </ReactFlowProvider>
        </div>
    );
}
