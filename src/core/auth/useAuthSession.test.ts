/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthSession } from './useAuthSession';
import { supabase } from '../supabase/client';
import type { Session, AuthChangeEvent, AuthResponse, AuthConfigResponse } from '@supabase/supabase-js';

vi.mock('../supabase/client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        }
    }
}));

describe('useAuthSession', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with loading state and fetch session', async () => {
        const mockSession = { user: { email: 'test@example.com' } } as Session;
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: mockSession },
            error: null
        } as AuthResponse);

        const { result } = renderHook(() => useAuthSession());

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.user).toEqual(mockSession.user);
    });

    it('should update state when auth state changes', async () => {
        let authChangeCallback: (event: AuthChangeEvent, session: Session | null) => void;
        vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
            authChangeCallback = cb;
            return {
                data: { subscription: { unsubscribe: vi.fn() } },
                error: null
            } as AuthConfigResponse;
        });
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: null },
            error: null
        } as AuthResponse);

        const { result } = renderHook(() => useAuthSession());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.session).toBe(null);

        const newSession = { user: { email: 'new@example.com' } } as Session;

        const { act } = await import('@testing-library/react');
        await act(async () => {
            authChangeCallback!('SIGNED_IN', newSession);
        });

        expect(result.current.session).toEqual(newSession);
        expect(result.current.user?.email).toBe('new@example.com');
    });
});
