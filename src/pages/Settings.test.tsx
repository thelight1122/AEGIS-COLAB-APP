/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';

vi.mock('../contexts/KeyringContext', () => ({
    useKeyring: () => ({
        status: 'unlocked',
        keys: {},
        isPersisted: false,
        unlock: vi.fn(),
        lock: vi.fn(),
        forget: vi.fn(),
        clearPersist: vi.fn(),
        setProviderSecret: vi.fn(),
        hasEncryptedKey: vi.fn(),
    }),
}));

vi.mock('../contexts/ArchiveContext', () => ({
    useArchive: () => ({
        status: 'unlocked',
        unlockArchive: vi.fn(),
        lockArchive: vi.fn(),
        setupArchive: vi.fn(),
        exportVault: vi.fn(),
        importVault: vi.fn(),
    }),
}));

describe('Settings', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('shows hosted API keys and local substrate access path fields', () => {
        render(<Settings />);

        expect(screen.getByLabelText('OpenAI Access Key')).toBeInTheDocument();
        expect(screen.getByLabelText('Gemini Access Key')).toBeInTheDocument();
        expect(screen.getByLabelText('Anthropic Access Key')).toBeInTheDocument();
        expect(screen.getByLabelText('Grok / xAI Access Key')).toBeInTheDocument();

        expect(screen.getByLabelText('LM Studio Access Path URL')).toHaveValue('http://localhost:1234/v1');
        expect(screen.getByLabelText('LM Studio Runtime Model')).toBeInTheDocument();
        expect(screen.getByLabelText('Ollama Access Path URL')).toHaveValue('http://localhost:11434');
        expect(screen.getByLabelText('Ollama Runtime Model')).toBeInTheDocument();
    });
});

