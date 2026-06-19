import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const chamberDir = join(process.cwd(), 'src', 'components', 'chamber');
const commonsDir = join(process.cwd(), 'src', 'components', 'commons');

describe('production Chamber surface', () => {
    it('starts the whiteboard empty and exposes clear/delete controls', () => {
        const source = readFileSync(join(chamberDir, 'WhiteboardArea.tsx'), 'utf8');

        expect(source).toContain('const initialNodes: AppNode[] = []');
        expect(source).toContain('const initialEdges: Edge[] = []');
        expect(source).toContain('Clear Board');
        expect(source).toContain('Delete Selected');
    });

    it('keeps chat selectable and IDS bounded with card deletion', () => {
        const chamber = readFileSync(join(chamberDir, 'ChamberLayout.tsx'), 'utf8');
        const ids = readFileSync(join(chamberDir, 'IDSStream.tsx'), 'utf8');

        expect(chamber).toContain("useState<'whiteboard' | 'chat' | 'reflection'>('whiteboard')");
        expect(chamber).toContain("activeTab === 'chat'");
        expect(chamber).toContain('className="h-full min-h-0 bg-background-dark/40"');
        expect(chamber).toContain('layout="vertical"');
        expect(ids).toContain("const isCompactDock = layout === 'horizontal'");
        expect(ids).toContain('h-full min-h-0 max-h-full flex flex-col overflow-hidden');
        expect(ids).toContain('bg-transparent flex-col overflow-y-auto');
        expect(ids).toContain('onRemoveCard');
        expect(ids).toContain('Delete IDS card');
    });

    it('keeps the RLS Reflect control visible on Chamber and Commons surfaces', () => {
        const chamber = readFileSync(join(chamberDir, 'ChamberLayout.tsx'), 'utf8');
        const workshop = readFileSync(join(commonsDir, 'WorkshopInterior.tsx'), 'utf8');

        expect(chamber).toContain('RLS_PROMPT');
        expect(chamber).toContain('data-testid="rls-reflect"');
        expect(chamber).toContain('Run Recursive Learning Session on the latest exchange');
        expect(chamber).toContain('Clock Reflect');

        expect(workshop).toContain('canRunRLS');
        expect(workshop).toContain('Run Recursive Learning Session on the latest CyberPeer response');
    });

    it('marks the Chamber frame locked and keeps chat export in the existing session controls', () => {
        const chamber = readFileSync(join(chamberDir, 'ChamberLayout.tsx'), 'utf8');
        const lockDoc = readFileSync(join(process.cwd(), 'docs', 'CHAMBER_STRUCTURE_LOCK.md'), 'utf8');

        expect(chamber).toContain('CHAMBER_FRAME_LOCKED_ON');
        expect(chamber).toContain('data-frame-locked-on={CHAMBER_FRAME_LOCKED_ON}');
        expect(chamber).toContain('data-testid="export-chat-log"');
        expect(chamber).toContain('formatChamberChatLog');
        expect(chamber).toContain('Export Chamber chat log');

        expect(lockDoc).toContain('The Chamber framed structure is locked by Tracey.');
        expect(lockDoc).toContain('Structural changes require explicit approval before implementation.');
    });
});
