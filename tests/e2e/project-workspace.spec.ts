import { test, expect } from '@playwright/test';

test.describe('project workspace', () => {
    test('sidebar swap + sub-nav deep links', async ({ page }) => {
        test.setTimeout(60_000);

        await page.goto('/projects');
        // Open the seeded project. Rows are clickable divs (not <a> links), so
        // target via data-testid + name filter — mirrors projects.spec.ts.
        await page.locator('[data-testid^="project-row-"]').filter({ hasText: 'Smoke Roadmap Project' }).click();
        await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);

        // Project sidebar replaced the global nav. The redesigned GlobalSidebar
        // has no top-level "Teams" link at all anymore, so its absence can't be
        // used as a signal; assert on "My Teams" (the collapsible section header
        // that's unique to the global shell) instead.
        await expect(page.getByRole('link', { name: /All projects/ })).toBeVisible();
        await expect(page.getByText('My Teams')).toHaveCount(0);

        // Overview shows the hero
        await expect(page.getByRole('heading', { name: /Smoke Roadmap Project/ })).toBeVisible();

        // Sub-nav: Issues
        await page.getByRole('link', { name: /^Issues/ }).click();
        await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/issues$/);
        await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();

        // Sub-nav: Cycles (coming soon)
        await page.getByRole('link', { name: /^Cycles/ }).click();
        await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/cycles$/);
        await expect(page.getByText('Project cycles are coming soon')).toBeVisible();

        // Sub-nav: Roadmap
        await page.getByRole('link', { name: /^Roadmap/ }).click();
        await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/roadmap$/);
        await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();

        // Back to the global shell
        await page.getByRole('link', { name: /All projects/ }).click();
        await expect(page).toHaveURL(/\/projects$/);
        await expect(page.getByText('My Teams')).toBeVisible();
    });
});
