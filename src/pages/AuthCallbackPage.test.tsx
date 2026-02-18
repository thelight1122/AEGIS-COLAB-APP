/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthCallbackPage from './AuthCallbackPage';
import { supabase } from '../core/supabase/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { Session, AuthTokenResponse } from '@supabase/supabase-js';

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

// Mock Supabase
vi.mock('../core/supabase/client', () => ({
    supabase: {
        auth: {
            exchangeCodeForSession: vi.fn(),
            setSession: vi.fn(),
            getSession: vi.fn(),
        }
    }
}));

describe('AuthCallbackPage', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    });

    it('should exchange code for session and redirect on success', async () => {
        const mockLocation = new URL('http://localhost/auth/callback?code=test-code');
        vi.stubGlobal('location', mockLocation);

        const mockSession = { user: { email: 'test@example.com' } } as Session;
        vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
            data: { session: mockSession, user: mockSession.user },
            error: null
        } as AuthTokenResponse);

        render(
            <MemoryRouter>
                <AuthCallbackPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Authenticating/i)).toBeDefined();

        await waitFor(() => {
            expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
        });

        await waitFor(() => {
            expect(screen.getByText(/Identity Verified/i)).toBeDefined();
        }, { timeout: 2000 });

        // Wait for the setTimeout redirect
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        }, { timeout: 3000 });
    });

    it('should handle redirectTo parameter on success', async () => {
        const mockLocation = new URL('http://localhost/auth/callback?code=test-code&redirectTo=/board');
        vi.stubGlobal('location', mockLocation);

        const mockSession = { user: { email: 'test@example.com' } } as Session;
        vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
            data: { session: mockSession, user: mockSession.user },
            error: null
        } as AuthTokenResponse);

        render(
            <MemoryRouter>
                <AuthCallbackPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/board', { replace: true });
        }, { timeout: 3000 });
    });

    it('should handle implicit flow tokens with setSession', async () => {
        const mockLocation = new URL('http://localhost/auth/callback#access_token=abc&refresh_token=123');
        vi.stubGlobal('location', mockLocation);

        const mockSession = { user: { email: 'test@example.com' } } as Session;
        vi.mocked(supabase.auth.setSession).mockResolvedValue({
            data: { session: mockSession, user: mockSession.user },
            error: null
        } as AuthTokenResponse);

        render(
            <MemoryRouter>
                <AuthCallbackPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(supabase.auth.setSession).toHaveBeenCalledWith({
                access_token: 'abc',
                refresh_token: '123'
            });
        });

        await waitFor(() => {
            expect(screen.getByText(/Identity Verified/i)).toBeDefined();
        });
    });

    it('should handle hash-based errors (e.g. otp_expired)', async () => {
        const mockLocation = new URL('http://localhost/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
        vi.stubGlobal('location', mockLocation);

        render(
            <MemoryRouter>
                <AuthCallbackPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Seal Failure/i)).toBeDefined();
            expect(screen.getByText(/CODE: otp_expired/i)).toBeDefined();
            expect(screen.getByText(/Email link is invalid or has expired/i)).toBeDefined();
            expect(screen.getByText(/use the most recent email link/i)).toBeDefined();
        });
    });

    it('should show error message if code exchange fails', async () => {
        const mockLocation = new URL('http://localhost/auth/callback?code=bad-code');
        vi.stubGlobal('location', mockLocation);

        vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
            data: { session: null, user: null },
            error: { message: 'Invalid code', name: 'AuthError', status: 400 } as unknown as AuthTokenResponse['error']
        } as AuthTokenResponse);

        render(
            <MemoryRouter>
                <AuthCallbackPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Seal Failure/i)).toBeDefined();
            expect(screen.getByText(/Invalid code/i)).toBeDefined();
        });
    });

    it('should fall back to getSession if no code or tokens are present', async () => {
        vi.stubGlobal('location', new URL('http://localhost/auth/callback'));

        const mockSession = { user: { email: 'test@example.com' } } as Session;
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: mockSession },
            error: null
        } as unknown as AuthTokenResponse);

        render(
            <MemoryRouter>
                <AuthCallbackPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(supabase.auth.getSession).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText(/Identity Verified/i)).toBeDefined();
        });
    });
});
