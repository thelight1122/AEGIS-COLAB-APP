import { test, expect } from '@playwright/test';

declare global {
    interface Window {
        __AEGIS_E2E__?: {
            resetAppState: () => void;
            seedScenarioLockableAfterActions: () => void;
            seedReadyToLock: () => void;
        };
    }
}


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

    test('BM-QA-BMs: Weighted Intersection & Shadow Affect Detection', async ({ page }) => {
        // 1. Setup multi-domain artifact
        await page.getByTestId('edit-metadata').click();
        await page.locator('input[aria-label="Target Domains"]').fill('Product, Engineering');
        await page.locator('button[title*="Save Metadata"]').click();

        // 2. Verify "Primary domain experts missing" in Convergence Pending section (or alert if we tried to lock)
        // Since we can't easily read the text of the pending section without specific IDs, 
        // we'll look for the lack of lock button.
        await expect(page.getByTestId('lock-button')).not.toBeAttached();

        // 3. Trigger a shadow affect by sending a message (wait, shadow affects are detected from events)
        // Actually, in this app, 'DEFER_LENS' rationale is a governance event.
        const productDefer = page.getByTestId('defer-lens-Product');
        await productDefer.click();

        const textarea = page.getByTestId('defer-rationale');
        const saveButton = page.getByTestId('confirm-defer');

        await textarea.fill('I MUST have this for my survival');
        await saveButton.click();

        // 4. Verify that lock is still unavailable even if other criteria met
        // We need to fulfill others first.
        // Product ack (p3), Eng ack (p2)
        await page.getByTestId('peer-ack-p3').click();
        await page.getByTestId('peer-ack-p2').click();
        // Eng lens invoke
        await page.getByTestId('invoke-lens-Engineering').click();

        // Even if all acked and domains covered, shadow affect 'I MUST' should block lock
        await expect(page.getByTestId('lock-button')).not.toBeAttached();

        // 5. Check for "Shadow Affects detected" in the convergence pending text
        await expect(page.locator('div:has-text("Shadow Affects detected")')).toBeVisible();
    });

    test('BM-QA-BMs: Love Vibe Frequency Visualization', async ({ page }) => {
        const telemetryPanel = page.locator('div:has-text("Coherence Telemetry")').first().locator('..');

        // 1. Initial background (neutral)
        // Note: background might be complex with gradients, so we check for the exclusion score increment
        const initialBg = await telemetryPanel.evaluate(el => window.getComputedStyle(el).background);

        // 2. Increase inclusion score
        await page.getByTestId('peer-ack-p1').click(); // Acknowledge User

        // 3. Verify background change (it should have a gradient with the 'Love Vibe' pink-ish color hsla(320...))
        const activeBg = await telemetryPanel.evaluate(el => window.getComputedStyle(el).background);
        expect(activeBg).not.toBe(initialBg);
    });

});
