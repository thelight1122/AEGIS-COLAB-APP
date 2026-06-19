/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LessonPlanBuilder } from './LessonPlanBuilder';
import { loadSessions } from '../../core/sessions/sessionStore';

vi.mock('../../core/sessions/sessionStore', () => ({
    loadSessions: vi.fn(),
}));

vi.mock('../../core/lessons/lessonStore', () => ({
    saveLessonPlan: vi.fn(),
}));

describe('LessonPlanBuilder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(loadSessions).mockReturnValue([{
            id: 'session-empty',
            artifactId: 'artifact-1',
            status: 'Closed',
            participants: ['@tracey'],
            eventLog: [],
        }]);
    });

    it('provides a manual calibration step editor when the source session has no exchanges', () => {
        render(
            <MemoryRouter>
                <LessonPlanBuilder />
            </MemoryRouter>
        );

        expect(screen.getByText('No exchanges logged in this session.')).toBeInTheDocument();
        expect(screen.getByLabelText('Manual Step Content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add manual step/i })).toBeInTheDocument();
    });
});
