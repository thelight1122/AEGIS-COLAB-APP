import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    createSession,
    startSession,
    closeSession,
    canStartSession,
    applyAbandonment
} from './sessionStore';
import type { Session } from './types';

describe('sessionStore Logic', () => {
    const artifactId = 'A-1';

    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => { store[key] = value.toString(); },
            clear: () => { store = {}; },
            removeItem: (key: string) => { delete store[key]; }
        };
    })();

    beforeEach(() => {
        Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
        Object.defineProperty(global, 'crypto', {
            value: { randomUUID: () => `test-uuid-${Math.random()}` },
            writable: true
        });
        localStorage.clear();
        vi.useFakeTimers();
    });

    it('should allow creating a session in Draft status', () => {
        const { sessions, session } = createSession([], artifactId);
        expect(sessions).toHaveLength(1);
        expect(session.status).toBe('Draft');
        expect(session.artifactId).toBe(artifactId);
    });

    it('should allow starting a session when none are active', () => {
        const { sessions: s1, session: draft } = createSession([], artifactId);
        const { sessions: s2, session: active } = startSession(s1, draft.id);
        expect(active.status).toBe('Active');
        expect(active.startedAt).toBeDefined();
        expect(canStartSession(s2, artifactId)).toBe(false);
    });

    it('should throw if starting a second active session for the same artifact', () => {
        const { sessions: s1, session: d1 } = createSession([], artifactId);
        const { sessions: s2 } = startSession(s1, d1.id);

        const { sessions: s3, session: d2 } = createSession(s2, artifactId);

        expect(() => startSession(s3, d2.id)).toThrow('Active session already exists for artifact');
    });

    it('should allow closing a session', () => {
        const { sessions: s1, session: d1 } = createSession([], artifactId);
        const { sessions: s2 } = startSession(s1, d1.id);
        const s3 = closeSession(s2, d1.id);

        expect(s3[0].status).toBe('Closed');
        expect(s3[0].closedAt).toBeDefined();
        expect(canStartSession(s3, artifactId)).toBe(true);
    });

    it('should correctly mark sessions as abandoned based on inactivity', () => {
        const initialTime = 1000;
        vi.setSystemTime(initialTime);

        const { sessions: s1, session: d1 } = createSession([], artifactId);
        const { sessions: s2 } = startSession(s1, d1.id);

        // Threshold is e.g. 30 mins (1800000 ms)
        const threshold = 1800000;

        // Jump forward 31 mins
        vi.setSystemTime(initialTime + threshold + 60000);

        const abandoned = applyAbandonment(s2, threshold);
        expect(abandoned[0].status).toBe('Abandoned');
        expect(abandoned[0].abandonmentReason).toContain('Inactive');
    });

    it('should not abandon active sessions if they were recently active', () => {
        const initialTime = 1000;
        vi.setSystemTime(initialTime);

        const { sessions: s1, session: d1 } = createSession([], artifactId);
        const { sessions: s2 } = startSession(s1, d1.id);

        const threshold = 1800000;

        // Jump forward 15 mins
        vi.setSystemTime(initialTime + threshold / 2);

        const checked = applyAbandonment(s2, threshold);
        expect(checked[0].status).toBe('Active');
    });
});
