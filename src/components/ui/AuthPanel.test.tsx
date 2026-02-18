/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthPanel } from './AuthPanel';
import { supabase } from '../../core/supabase/client';
import { useAuthSession } from '../../core/auth/useAuthSession';
import type { Session, User, AuthOtpResponse } from '@supabase/supabase-js';
import '@testing-library/jest-dom';

vi.mock('../../core/supabase/client', () => ({
    supabase: {
        auth: {
            signInWithOtp: vi.fn(),
            signOut: vi.fn()
        }
    }
}));

vi.mock('../../core/auth/useAuthSession', () => ({
    useAuthSession: vi.fn()
}));

describe('AuthPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should call signInWithOtp on form submission and enter cooldown', async () => {
        vi.mocked(useAuthSession).mockReturnValue({ session: null, user: null, loading: false });
        // Use a promise that resolves immediately
        const signInPromise = Promise.resolve({
            data: { user: null, session: null },
            error: null
        } as AuthOtpResponse);
        vi.mocked(supabase.auth.signInWithOtp).mockReturnValue(signInPromise);

        render(<AuthPanel />);

        const emailInput = screen.getByPlaceholderText(/agent@aegis-facility.org/i);
        const sendButton = screen.getByRole('button', { name: /send magic link/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        // Wrap everything in act and await the promise
        await act(async () => {
            fireEvent.click(sendButton);
            await signInPromise;
        });

        // Advance timers to trigger the first setCooldown/interval
        act(() => {
            vi.advanceTimersByTime(0);
        });

        expect(screen.getByText(/magic link sent/i)).toBeDefined();
        expect(screen.getByText(/retry in 60s/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /retry in 60s/i })).toBeDisabled();
    });

    it('should persist cooldown across renders/mounts', async () => {
        vi.mocked(useAuthSession).mockReturnValue({ session: null, user: null, loading: false });

        const now = Date.now();
        const future = now + 45000;
        localStorage.setItem('aegis_auth_cooldown', future.toString());

        render(<AuthPanel />);

        expect(screen.getByText(/retry in 45s/i)).toBeDefined();
    });

    it('should handle rate limit error gracefully', async () => {
        vi.mocked(useAuthSession).mockReturnValue({ session: null, user: null, loading: false });
        const rateLimitPromise = Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'Email rate limit exceeded', status: 429 } as unknown as any
        } as AuthOtpResponse);
        vi.mocked(supabase.auth.signInWithOtp).mockReturnValue(rateLimitPromise);

        render(<AuthPanel />);

        const emailInput = screen.getByPlaceholderText(/agent@aegis-facility.org/i);
        const sendButton = screen.getByRole('button', { name: /send magic link/i });

        fireEvent.change(emailInput, { target: { value: 'spam@example.com' } });

        await act(async () => {
            fireEvent.click(sendButton);
            await rateLimitPromise;
        });

        expect(screen.getByText(/email sending is temporarily limited/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /retry in 60s/i })).toBeDisabled();
    });

    it('should resume countdown and enable button after cooldown', async () => {
        vi.mocked(useAuthSession).mockReturnValue({ session: null, user: null, loading: false });
        const successPromise = Promise.resolve({
            data: { user: null, session: null },
            error: null
        } as AuthOtpResponse);
        vi.mocked(supabase.auth.signInWithOtp).mockReturnValue(successPromise);

        render(<AuthPanel />);

        fireEvent.change(screen.getByPlaceholderText(/agent@aegis-facility.org/i), { target: { value: 'timer@example.com' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));
            await successPromise;
        });

        expect(screen.getByText(/retry in 60s/i)).toBeDefined();

        // Advance timers by 60s + a small buffer
        act(() => {
            vi.advanceTimersByTime(61000);
        });

        expect(screen.queryByText(/retry in/i)).toBeNull();
        expect(screen.getByRole('button', { name: /send magic link/i })).not.toBeDisabled();
    });

    it('should call signOut when clicking sign out button', async () => {
        const mockUser = { email: 'active@example.com' } as User;
        const mockSession = { user: mockUser } as Session;
        vi.mocked(useAuthSession).mockReturnValue({
            session: mockSession,
            user: mockUser,
            loading: false
        });

        render(<AuthPanel />);

        const signOutButton = screen.getByRole('button', { name: /sign out/i });
        fireEvent.click(signOutButton);

        expect(supabase.auth.signOut).toHaveBeenCalled();
    });
});
