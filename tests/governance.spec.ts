import { test, expect } from '@playwright/test';

test.describe('Governance Integrity Protocol E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('GI-001/002: Peer Domain Management & Registry Persistence', async ({ page }) => {
        await page.goto('/peers');

        // Add a new peer with domains
        await page.getByRole('button', { name: /Add Peer/i }).click();
        await page.getByPlaceholder('e.g. Atlas (AI)').fill('QA Specialist');
        await page.getByPlaceholder('e.g. Systems Lens').fill('Verification');
        // Fix selector: use partial placeholder match for the new domains input
        await page.getByPlaceholder(/e.g. Engineering, Product/i).fill('QA, Testing, Governance');
        await page.getByRole('button', { name: "Save" }).click();

        // Verify the peer appears with domain tags
        await expect(page.getByText('QA Specialist')).toBeVisible();
    });

    test('GI-020: Lens Domain Mapping', async ({ page }) => {
        await page.goto('/lenses');

        // Verify a lens has its domains
        await expect(page.getByText('Product').first()).toBeVisible();
        // Product lens has 'Product' domain in mock data
        await expect(page.getByText('Product', { exact: true }).last()).toBeVisible();
    });

    test('GI-010/021/030: Chamber Domain Intersection & Lock Gating', async ({ page }) => {
        await page.goto('/chamber');

        // Verify initial state (Operational Layer is a default domain)
        await expect(page.getByText(/Operational Layer/i).first()).toBeVisible();

        // Edit artifact metadata to add a domain
        await page.getByRole('button', { name: /Edit Metadata/i }).first().click();

        // Use ARIA label for precise selection
        const domainInput = page.getByLabel('Target Domains');
        await expect(domainInput).toBeVisible();
        await domainInput.clear();
        await domainInput.fill('Security, Engineering');

        // Click Save (using the correct title/name)
        await page.getByRole('button', { name: /Save Metadata/i }).click();

        // Verify Peer Presence updates (Atlas and Critique should be relevant)
        await expect(page.getByText('Atlas (AI)').first()).toBeVisible();
        await expect(page.getByText('Critique (AI)').first()).toBeVisible();

        // Verify Telemetry Panel shows missing lenses for new domains
        await expect(page.getByText(/Security/i).first()).toBeVisible();

        // Verify Lock Version button is disabled initially (text will be "Convergence Pending")
        const lockButton = page.getByRole('button', { name: /Lock Version|Convergence Pending/i });
        await expect(lockButton).toBeDisabled();

        // Defer a lens with rationale
        await page.getByRole('button', { name: /Defer/i }).first().click();
        await page.getByPlaceholder(/Reason for deferral/i).fill('Testing rationale persistence.');
        await page.getByRole('button', { name: "Save" }).click();
    });

    test('TC-060: Lock Availability Logic Assertions', async ({ page }) => {
        await page.goto('/chamber');

        // Final check on convergence criteria state (initially pending)
        await expect(page.getByRole('button', { name: /Lock Version|Convergence Pending/i })).toBeDisabled();
    });
});
