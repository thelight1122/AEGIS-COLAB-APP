import { test, expect } from '@playwright/test';

/**
 * Governance Integrity Validation Protocol v1.0
 */

test.describe('Governance Integrity Validation', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/?e2e=1');
        // Use the E2E harness for deterministic seeding
        await page.evaluate(() => {
            if (window.__AEGIS_E2E__) {
                window.__AEGIS_E2E__.resetAppState();
                window.__AEGIS_E2E__.seedScenarioLockableAfterActions();
            }
        });
        await page.reload();
    });

    test('BM-QA-01: Strict Visibility Gating for Lock Button', async ({ page }) => {
        // 1. Initial State: Lock button should not be present
        const lockButton = page.getByTestId('lock-button');
        await expect(lockButton).not.toBeAttached();

        // 2. Narrow domains to 'Product' to isolate Sarah
        await page.getByTestId('edit-metadata').click();
        const domainInput = page.locator('input[aria-label="Target Domains"]');
        await domainInput.fill('Product');
        await page.locator('button[title*="Save Metadata"]').click();

        // Wait for the UI to reflect the intersection
        const awarenessPercent = page.getByTestId('awareness-percent');
        await expect(awarenessPercent).toBeVisible({ timeout: 10000 });

        // 3. Acknowledge necessary peer (Sarah for Product - p3)
        const sarahAck = page.getByTestId('peer-ack-p3');
        await expect(sarahAck).toBeVisible();
        await sarahAck.click();

        // 4. Button should still be missing (missing lenses)
        await expect(lockButton).not.toBeAttached();

        // 5. Invoke missing lenses
        const productInvoke = page.getByTestId('invoke-lens-Product');
        await expect(productInvoke).toBeVisible();
        await productInvoke.click();

        // 6. Lock button appears after criteria are met
        await expect(lockButton).toBeVisible({ timeout: 15000 });
    });

    test('BM-QA-01: Deferral Requires Rationale', async ({ page }) => {
        // 1. Initial State: Product lens should be missing (guaranteed by e2eHarness seed)
        await expect(page.getByTestId('missing-lens-Product')).toBeVisible();
        await expect(page.getByTestId('lock-button')).not.toBeAttached();

        // 2. Sarah (Product peer) must acknowledge awareness for lock to be possible
        const ackButton = page.getByTestId('peer-ack-p3');
        await expect(ackButton).toBeVisible();
        await ackButton.click();
        await expect(ackButton).not.toBeVisible();

        // 3. Trigger deferral dialog
        const deferButton = page.getByTestId('defer-lens-Product');
        await expect(deferButton).toBeVisible();
        await deferButton.click();

        const textarea = page.getByTestId('defer-rationale');
        const saveButton = page.getByTestId('confirm-defer');

        // 3. Invalid: Empty rationale (whitespace)
        await textarea.fill('   ');
        await saveButton.click();

        // Assert: Product lens remains in missing list, NOT deferred
        await expect(page.getByTestId('missing-lens-Product')).toBeVisible();
        await expect(page.getByTestId('lock-button')).not.toBeAttached();

        // 4. Valid: Provide rationale
        await deferButton.click();
        await textarea.fill('Mandatory deferred for logic verification');
        await saveButton.click();

        // Assert: Product lens moved to active-lenses/deferred state
        await expect(page.getByTestId('missing-lens-Product')).not.toBeVisible();
        await expect(page.getByTestId('lens-deferred-Product')).toBeVisible({ timeout: 10000 });

        // Assert: Lock button becomes attached
        await expect(page.getByTestId('lock-button')).toBeVisible({ timeout: 15000 });
    });

    test('BM-QA-01: Ledger Snapshot Integrity', async ({ page }) => {
        // Setup Engineering domain
        await page.getByTestId('edit-metadata').click();
        await page.locator('input[aria-label="Target Domains"]').fill('Engineering');
        await page.locator('button[title*="Save Metadata"]').click();

        // Acknowledge User (p1)
        const userAck = page.getByTestId('peer-ack-p1');
        await userAck.click();

        // Invoke Engineering lens
        const engInvoke = page.getByTestId('invoke-lens-Engineering');
        await engInvoke.click();

        const lockButton = page.getByTestId('lock-button');
        await expect(lockButton).toBeVisible({ timeout: 10000 });

        // Verify alert contents
        page.once('dialog', async dialog => {
            const msg = dialog.message();
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
