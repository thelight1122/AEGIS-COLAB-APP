import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const BOARD_PAGE_PATH = path.resolve(__dirname, '../pages/BoardPage.tsx');
const MIGRATION_PATH = path.resolve(__dirname, '../../supabase/presence_migration.sql');

describe('Realtime & Presence Contract', () => {
    const boardCode = fs.readFileSync(BOARD_PAGE_PATH, 'utf-8');
    const migrationCode = fs.readFileSync(MIGRATION_PATH, 'utf-8');

    describe('Schema Contract', () => {
        it('should define peer_presence table', () => {
            expect(migrationCode).toContain('CREATE TABLE IF NOT EXISTS public.peer_presence');
            expect(migrationCode).toContain('status TEXT NOT NULL DEFAULT \'offline\'');
            expect(migrationCode).toContain('last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()');
        });

        it('should enforce presence RLS', () => {
            expect(migrationCode).toContain('ALTER TABLE public.peer_presence ENABLE ROW LEVEL SECURITY');
            expect(migrationCode).toContain('CREATE POLICY "Allow select for authenticated"');
            expect(migrationCode).toContain('CREATE POLICY "Allow upsert for own presence"');
        });
    });

    describe('Threads Realtime', () => {
        it('should subscribe to threads inserts', () => {
            expect(boardCode).toContain('.channel(\'public:threads\')');
            expect(boardCode).toContain('event: \'INSERT\'');
            expect(boardCode).toContain('table: \'threads\'');
        });

        it('should deduplicate and prepend new threads', () => {
            expect(boardCode).toContain('if (prev.some(t => t.id === newThread.id)) return prev');
            expect(boardCode).toContain('return [newThread, ...prev]');
        });
    });

    describe('Messages Realtime', () => {
        it('should subscribe to messages with thread filter', () => {
            expect(boardCode).toContain('table: \'messages\'');
            expect(boardCode).toContain('filter: `thread_id=eq.${selectedThreadId}`');
        });

        it('should deduplicate incoming messages', () => {
            expect(boardCode).toContain('if (prev.some(m => m.id === newMessage.id)) return prev');
        });

        it('should respect manual scroll position', () => {
            expect(boardCode).toContain('const [autoScroll, setAutoScroll] = useState(true)');
            expect(boardCode).toContain('onScroll={handleScroll}');
            expect(boardCode).toContain('New messages below');
        });
    });

    describe('Presence Heartbeat', () => {
        it('should implement 30s heartbeat', () => {
            expect(boardCode).toContain('setInterval(() => heartbeat(), 30000)');
        });

        it('should update on visibility change', () => {
            expect(boardCode).toContain('document.addEventListener(\'visibilitychange\', handleVisibilityChange)');
        });

        it('should allow opting out of presence', () => {
            expect(boardCode).toContain('if (!session || !selectedPeerId || !sharePresence) return');
            expect(boardCode).toContain('Share Presence');
        });
    });

    describe('Presence UI', () => {
        it('should display presence indicators on messages', () => {
            expect(boardCode).toContain('getPresenceStatus(m.author_peer_id)');
            expect(boardCode).toContain('bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]');
        });
    });

    describe('AI Peer Simulator (DEV)', () => {
        it('should contain a simulation panel in DEV mode', () => {
            expect(boardCode).toContain('import.meta.env.DEV');
            expect(boardCode).toContain('AI Simulator');
            expect(boardCode).toContain('simulateAIMessage');
        });

        it('should parse simulated AI names from body', () => {
            expect(boardCode).toContain('m.kind === \'ai_sim\'');
            expect(boardCode).toContain('m.body.match(/^\\[SIM:([^\\]]+)\\] (.*)/)');
        });

        it('should display AI badges for simulated posts', () => {
            expect(boardCode).toContain('AI</span>}');
        });
    });
});
