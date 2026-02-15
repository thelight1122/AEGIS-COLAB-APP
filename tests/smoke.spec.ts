import { test, expect } from '@playwright/test';

test.describe('AEGIS Chamber Smoke Tests', () => {

    test('should load the Chamber (landing page)', async ({ page }) => {
        await page.goto('/');
        // Verify sidebar logo text
        await expect(page.getByText('AEGIS').first()).toBeVisible();
        // Verify we are in the Chamber by looking for characteristic text
        await expect(page.getByText(/Coherence Telemetry/i)).toBeVisible();
        await expect(page.getByText(/IDS Stream/i)).toBeVisible();
    });

    test('should navigate to the Artifacts Archive', async ({ page }) => {
        await page.goto('/artifacts');
        await expect(page.getByRole('heading', { name: /Artifacts Archive/i })).toBeVisible();
        // Corrected text from actual implementation
        await expect(page.getByText(/Version Timeline/i)).toBeVisible();
    });

    test('should navigate to the Peer Registry', async ({ page }) => {
        await page.goto('/peers');
        await expect(page.getByRole('heading', { name: /Peer Registry/i })).toBeVisible();
        await expect(page.getByPlaceholder(/Search peers/i)).toBeVisible();
    });

    test('should navigate to Lenses Configuration', async ({ page }) => {
        await page.goto('/lenses');
        await expect(page.getByRole('heading', { name: /Lenses Configuration/i })).toBeVisible();
        await expect(page.getByText(/Product/i).first()).toBeVisible();
    });

    test('should navigate to Sessions History', async ({ page }) => {
        await page.goto('/sessions');
        await expect(page.getByRole('heading', { name: /Past Sessions/i })).toBeVisible();
        await expect(page.getByText(/RAG Architecture Sync/i).first()).toBeVisible();
    });

    test('should navigate to Settings', async ({ page }) => {
        await page.goto('/settings');
        await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    });

    test('responsive layout check', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await expect(page.getByText('AEGIS').first()).toBeVisible();
    });
});
