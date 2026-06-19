/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdvisorProvider, useAdvisor } from './AdvisorContext';
import { callGateway } from '../core/llm/gatewayClient';

vi.mock('./KeyringContext', () => ({
    useKeyring: () => ({
        status: 'unlocked',
        keys: { gemini: 'test-gemini-key' },
    }),
}));

vi.mock('../core/llm/gatewayClient', () => ({
    callGateway: vi.fn(),
}));

function AdvisorHarness() {
    const { messages, addMessage, isResponding } = useAdvisor();
    return (
        <div>
            <button onClick={() => void addMessage('Help me plan the lesson', 'user')}>Ask</button>
            <div data-testid="responding">{String(isResponding)}</div>
            {messages.map(message => (
                <p key={message.id}>{message.text}</p>
            ))}
        </div>
    );
}

describe('AdvisorProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(callGateway).mockResolvedValue({
            text: 'Gemini live advisor response',
        });
    });

    it('calls Gemini through the gateway using the unlocked vault key', async () => {
        render(
            <AdvisorProvider>
                <AdvisorHarness />
            </AdvisorProvider>
        );

        await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

        await waitFor(() => {
            expect(screen.getByText('Gemini live advisor response')).toBeInTheDocument();
        });

        expect(callGateway).toHaveBeenCalledWith(expect.objectContaining({
            provider: 'gemini',
            apiKey: 'test-gemini-key',
        }));
        expect(vi.mocked(callGateway).mock.calls[0][0].messages[0]).toMatchObject({
            role: 'system',
        });
    });
});

