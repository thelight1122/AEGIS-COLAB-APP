import { test, expect } from '@playwright/test';

/**
 * Governance Integrity Validation Protocol v1.0
 */

test.describe('Governance Integrity Validation', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
    });

    test('BM-QA-01: Strict Visibility Gating for Lock Button', async ({ page }) => {
        // 1. Initial State
        const lockButton = page.locator('#lock-version-button');
        await expect(lockButton).not.toBeAttached();

        // 2. Narrow domains
        await page.locator('button[title*="Edit Metadata"]').click();
        const domainInput = page.locator('input[aria-label="Target Domains"]');
        await domainInput.fill('Product');
        await page.locator('button[title*="Save Metadata"]').click();

        // Wait for the UI to reflect the intersection
        const lensesList = page.locator('div.space-y-2').filter({ hasText: 'Lens Coverage' });
        await expect(lensesList.getByText('Product')).toBeVisible({ timeout: 10000 });

        // 3. Acknowledge necessary peer (Sarah for Product)
        // Peer Acknowledgment header
        const peersList = page.locator('div.space-y-2').filter({ hasText: 'Peer Acknowledgment' });
        // Actually Sarah has '✓' or '...' button.
        // Let's just click all dots in the peer section.
        const ackButtons = peersList.locator('span.cursor-pointer').filter({ hasText: '...' });

        while (await ackButtons.count() > 0) {
            await ackButtons.first().click();
            await page.waitForTimeout(500);
        }

        // 4. Button should still be missing (missing lenses)
        await expect(lockButton).not.toBeAttached();

        // 5. Invoke missing lenses (Product)
        const invokeButtons = lensesList.locator('button:has-text("Invoke")');
        while (await invokeButtons.count() > 0) {
            await invokeButtons.first().click();
            await page.waitForTimeout(500);
        }

        // 6. Lock button appears
        await expect(lockButton).toBeVisible({ timeout: 15000 });
    });

    test('BM-QA-01: Deferral Requires Rationale', async ({ page }) => {
        const lensesList = page.locator('div.space-y-2').filter({ hasText: 'Lens Coverage' });

        // Find a lens with !!! (missing)
        const lensContainer = lensesList.locator('div.bg-destructive\\/5').first();
        await expect(lensContainer).toBeVisible();

        const lensNameWithIcon = await lensContainer.locator('span.font-medium').innerText();
        // It might be "!!! Product" or something else
        const lensName = lensNameWithIcon.replace('!!! ', '').replace('⚠ ', '').trim();

        await lensContainer.locator('button:has-text("Defer")').click();

        const textarea = page.locator('textarea[placeholder*="Reason for deferral"]');
        const saveButton = page.locator('button:has-text("Save")');

        // 1. Empty rationale (whitespace)
        await textarea.fill('   ');
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Should still be missing, NOT line-through
        const specificLens = lensesList.locator('div.bg-destructive\\/5').filter({ hasText: lensName });
        await expect(specificLens.locator('span.line-through')).not.toBeVisible();

        // 2. Valid rationale
        await specificLens.locator('button:has-text("Defer")').click();
        await textarea.fill('Mandatory deferred for logic verification');
        await saveButton.click();

        // Verify it's now deferred
        // Wait, line-through is on a span within lensesList
        await expect(lensesList.getByText(lensName)).toHaveClass(/line-through/, { timeout: 10000 });
    });

    test('BM-QA-01: Ledger Snapshot Integrity', async ({ page }) => {
        const peersList = page.locator('div.space-y-2').filter({ hasText: 'Peer Acknowledgment' });
        const lensesList = page.locator('div.space-y-2').filter({ hasText: 'Lens Coverage' });

        // Fast convergence
        await page.locator('button[title*="Edit Metadata"]').click();
        await page.locator('input[aria-label="Target Domains"]').fill('Engineering');
        await page.locator('button[title*="Save Metadata"]').click();
        await page.waitForTimeout(1000);

        const peerAckButtons = peersList.locator('span.cursor-pointer').filter({ hasText: '...' });
        while (await peerAckButtons.count() > 0) {
            await peerAckButtons.first().click();
            await page.waitForTimeout(500);
        }

        const invokeButtons = lensesList.locator('button:has-text("Invoke")');
        while (await invokeButtons.count() > 0) {
            await invokeButtons.first().click();
            await page.waitForTimeout(500);
        }

        const lockButton = page.locator('#lock-version-button');
        await expect(lockButton).toBeVisible({ timeout: 10000 });

        // Verify alert contents
        page.once('dialog', async dialog => {
            const msg = dialog.message();
            console.log(`Ledger Snapshot:\n${msg}`);
            expect(msg).toContain('🔒 Version Locked');
            expect(msg).toContain('Score: 100%');
            expect(msg).toContain('Participating Peers:');
            expect(msg).toContain('Lenses Represented:');
            expect(msg).toContain('Closure Rationale: Coherence criteria satisfied.');
            await dialog.accept();
        });

        await lockButton.click();
    });

});
