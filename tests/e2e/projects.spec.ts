import { expect, test } from '@playwright/test';

test('projects table + roadmap render the redesign', async ({ page }) => {
    test.setTimeout(60_000);

    // ── Projects table ────────────────────────────────────────────────────────
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'All projects' })).toBeVisible();
    // The SmokeSeeder guarantees at least "Smoke Roadmap Project" exists.
    await expect(page.locator('[data-testid^="project-row-"]').first()).toBeVisible();

    // ── Roadmap timeline ──────────────────────────────────────────────────────
    await page.goto('/roadmap');
    await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
    // The seeded project has start_date + target_date → renders a bar.
    await expect(page.locator('[data-testid^="bar-"]').first()).toBeVisible();
});
