import { test, expect } from '@playwright/test';

test.describe('IDS Stream Verification', () => {
    test('IDS Stream presence in sidebar and clearing functionality', async ({ page }) => {
        await page.goto('/chamber');

        // 1. Verify IDS Stream title in Sidebar
        const streamTitle = page.getByText(/IDS Stream/i);
        await expect(streamTitle).toBeVisible();

        // 2. Add content to stream and verify it is visible
        const inputTextbox = page.getByRole('textbox');
        await inputTextbox.fill('Potential drift detected in canon');
        await page.keyboard.press('Control+Enter');

        const firstCardContent = page.getByText(/Potential drift/i);
        await expect(firstCardContent).toBeVisible();

        // 3. Skipped navigation persistence check as IDS Stream is node/view specific.

        // 4. Test Clear Stream action from Sidebar
        // Handle confirmation dialog
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Are you sure you want to clear the IDS Stream?');
            await dialog.accept();
        });

        // The menu button in the header should trigger the clear action if implemented there, 
        // but in Sidebar.tsx I passed clearStream to the IDSStream component.
        // Let's find the clear button inside the component.
        const clearButton = page.getByRole('button', { name: /Begin New Chat/i });
        await clearButton.click();

        // 5. Verify stream is empty
        await expect(firstCardContent).not.toBeVisible();

        // 6. Verify input window (composer) is in the Chamber bottom rail
        // We navigate back to home if we are on Peers
        await page.getByRole('link', { name: /Chamber/i }).click();
        // 6. Verify input window (composer) is visible in the bottom layout
        await expect(page.getByRole('textbox')).toBeVisible();
        await expect(page.getByText(/identify/i)).toBeVisible();

        // 7. Verify sidebar does NOT have an input window
        const sidebar = page.locator('aside');
        await expect(sidebar.getByRole('textbox')).not.toBeVisible();
    });

    test('IDS Stream horizontal layout', async ({ page }) => {
        await page.goto('/chamber');

        // Verify the feed container has flex-row for horizontal layout
        // The feed area has bg-slate-50/50 dark:bg-slate-900/50
        const feedArea = page.locator('.bg-slate-50\\/50');
        await expect(feedArea).toHaveClass(/flex-row/);
    });
});
