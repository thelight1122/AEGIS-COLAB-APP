
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const BOARD_PAGE_PATH = path.resolve(__dirname, '../pages/BoardPage.tsx');

describe('Board Stabilization Contract', () => {
    const boardCode = fs.readFileSync(BOARD_PAGE_PATH, 'utf-8');

    it('should implement Loading Identity state', () => {
        expect(boardCode).toContain('const [peersLoading, setPeersLoading]');
        expect(boardCode).toContain('Loading AEGIS Identity...');
        expect(boardCode).toContain('animate-pulse');
    });

    it('should implement Action Error surfacing', () => {
        expect(boardCode).toContain('const [actionError, setActionError]');
        expect(boardCode).toContain('setActionError(error.message');
        expect(boardCode).toContain('bg-destructive/10'); // Styling for error banner
    });

    it('should have Dev Debug Footer', () => {
        expect(boardCode).toContain('import.meta.env.DEV');
        expect(boardCode).toContain('DEV DEBUG:');
    });

    it('should disable inputs during loading/error', () => {
        // Check for specific disabled conditions
        expect(boardCode).toContain('disabled={!session || threadsLoading}'); // Create Thread button
        expect(boardCode).toContain('disabled={!selectedThreadId}'); // Input
        // Expect Send button to check invalid state
        expect(boardCode).toContain('disabled={!selectedThreadId || !newMessage.trim()}');
    });

    it('should log stable error tags', () => {
        expect(boardCode).toContain("console.error('[peers.selectSelf]'");
        expect(boardCode).toContain("console.error('[threads.select]'");
        expect(boardCode).toContain("console.error('[threads.insert]'");
        expect(boardCode).toContain("console.error('[messages.select]'");
        expect(boardCode).toContain("console.error('[messages.insert]'");
    });
});
