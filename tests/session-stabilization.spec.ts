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
        });
        await page.reload();
    });

    test('BM-SESSION-QA-01: Start and Resume Session', async ({ page }) => {
        // 1. Navigate to Artifacts
        await expect(page.getByText('Artifacts Archive')).toBeVisible();

        // 2. Start a new session
        const startButton = page.getByTestId('session-start').first();
        await startButton.click();

        // 3. Verify redirection to Chamber
        await expect(page).toHaveURL(/\/(\?.*)?$/);
        await expect(page.getByText('Governance Integrity v1.0')).toBeVisible();

        // 4. Reload page
        await page.reload();

        // 5. Verify session persists (still in Chamber)
        await expect(page.getByText('Governance Integrity v1.0')).toBeVisible();
        await expect(page).toHaveURL(/\/(\?.*)?$/);
    });

    test('BM-SESSION-QA-02: Join Active Session', async ({ page, context }) => {
        // 1. Start session in first tab
        await page.getByTestId('session-start').first().click();
        const sessionId = await page.evaluate(() => {
            const sessions = JSON.parse(localStorage.getItem('aegis.sessions.v0') || '[]');
            return sessions[0]?.id;
        });
        expect(sessionId).toBeDefined();

        // 2. Open second tab
        const page2 = await context.newPage();
        await page2.goto('http://localhost:5173/artifacts?e2e=1');

        // 3. Verify "Join Active Session" is visible, "Start Session" is hidden
        await expect(page2.getByTestId('session-join')).toBeVisible();
        await expect(page2.getByTestId('session-start')).not.toBeVisible();

        // 4. Click Join
        await page2.getByTestId('session-join').click();

        // 5. Verify redirection
        await expect(page2).toHaveURL(/\/(\?.*)?$/);
    });
});
