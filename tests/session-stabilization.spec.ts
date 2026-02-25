import { test, expect } from '@playwright/test';

test.describe('Session Stabilization Integrity', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/artifacts?e2e=1');
        // Use harness for reset
        await page.evaluate(() => {
            if (window.__AEGIS_E2E__) {
                window.__AEGIS_E2E__.resetAppState();
            } else {
                localStorage.clear();
            }
            // Seed a closed session to prepopulate the Artifact Matrix
            const mockSession = {
                id: 'test-session-1',
                artifactId: 'Design System Update',
                startedAt: Date.now(),
                lastActiveAt: Date.now(),
                status: 'Closed',
                participants: ['p1'],
                eventLog: [],
                lockedVersionRef: 'lock-1'
            };
            localStorage.setItem('aegis.sessions.v0', JSON.stringify([mockSession]));
        });
        await page.reload();
    });

    test('BM-SESSION-QA-01: Start and Resume Session', async ({ page }) => {
        // 1. Navigate to Artifacts
        await expect(page.getByText('Artifact Matrix')).toBeVisible();

        // 2. Start a new session
        const startButton = page.getByRole('button', { name: /Start New Session/i }).first();
        await startButton.click();

        // 3. Verify redirection to Chamber
        await expect(page).toHaveURL(/.*\/chamber(\?.*)?$/);
        await expect(page.getByText('Governance Integrity v1.0')).toBeVisible();

        // 4. Reload page
        await page.reload();

        // 5. Verify session persists (still in Chamber)
        await expect(page.getByText('Governance Integrity v1.0')).toBeVisible();
        await expect(page).toHaveURL(/.*\/chamber(\?.*)?$/);
    });

    test('BM-SESSION-QA-02: Join Active Session', async ({ page, context }) => {
        // 1. Start session in first tab
        await page.getByRole('button', { name: /Start New Session/i }).first().click();
        const sessionId = await page.evaluate(() => {
            const sessions = JSON.parse(localStorage.getItem('aegis.sessions.v0') || '[]');
            return sessions[0]?.id;
        });
        expect(sessionId).toBeDefined();

        // 2. Open second tab
        const page2 = await context.newPage();
        await page2.goto('http://localhost:5173/artifacts?e2e=1');

        // 3. Verify "Join Active Session" is visible, "Start Session" is hidden
        await expect(page2.getByRole('button', { name: /Join Active Session/i })).toBeVisible();
        await expect(page2.getByRole('button', { name: /Start New Session/i })).not.toBeVisible();

        // 4. Click Join
        await page2.getByRole('button', { name: /Join Active Session/i }).click();

        // 5. Verify redirection
        await expect(page2).toHaveURL(/.*\/chamber(\?.*)?$/);
    });
});
