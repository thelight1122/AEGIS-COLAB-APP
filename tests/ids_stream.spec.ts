import { test, expect } from '@playwright/test';

test.describe('Shadow Stream Verification', () => {
    test('Shadow Stream presence in sidebar and clearing functionality', async ({ page }) => {
        await page.goto('/');

        // 1. Verify Shadow Stream title in Sidebar
        const streamTitle = page.getByText(/Shadow Stream/i);
        await expect(streamTitle).toBeVisible();

        // 2. Verify cards are visible in the sidebar stream
        // The mock feed has content like "Potential drift..."
        const firstCardContent = page.getByText(/Potential drift/i);
        await expect(firstCardContent).toBeVisible();

        // 3. Navigate to another page (Peers) and verify stream persists
        await page.getByRole('link', { name: /Peers/i }).click();
        await expect(page).toHaveURL(/.*peers/);
        await expect(streamTitle).toBeVisible();
        await expect(firstCardContent).toBeVisible();

        // 4. Test Clear Stream action from Sidebar
        // Handle confirmation dialog
        page.on('dialog', async dialog => {
            expect(dialog.message()).toBe('Are you sure you want to clear the IDS Stream?');
            await dialog.accept();
        });

        // The menu button in the header should trigger the clear action if implemented there, 
        // but in Sidebar.tsx I passed clearStream to the IDSStream component.
        // Let's find the clear button inside the component.
        const clearButton = page.getByRole('button', { name: /Clear Stream/i });
        await clearButton.click();

        // 5. Verify stream is empty
        await expect(firstCardContent).not.toBeVisible();

        // 6. Verify input window (composer) is in the Chamber bottom rail
        // We navigate back to home if we are on Peers
        await page.getByRole('link', { name: /Chamber/i }).click();
        const bottomRail = page.locator('.h-44');
        await expect(bottomRail.getByRole('textbox')).toBeVisible();
        await expect(bottomRail.getByText(/identify/i)).toBeVisible();

        // 7. Verify sidebar does NOT have an input window
        const sidebar = page.locator('aside');
        await expect(sidebar.getByRole('textbox')).not.toBeVisible();
    });

    test('Shadow Stream vertical layout', async ({ page }) => {
        await page.goto('/');

        // Verify the feed container has flex-col for vertical layout
        // The feed area has bg-slate-50/50 dark:bg-slate-900/50
        const feedArea = page.locator('.bg-slate-50\\/50');
        await expect(feedArea).toHaveClass(/flex-col/);
    });
});
