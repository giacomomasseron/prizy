import { expect, test } from '@playwright/test';

test('project detail: hero + progress + grouped issues render', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/projects');
    // Click the seeded project specifically to avoid picking a zero-issue project
    await page.locator('[data-testid^="project-row-"]').filter({ hasText: 'Smoke Roadmap Project' }).click();

    // URL must match /projects/<uuid>
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+/);

    // Progress card must be visible
    await expect(page.getByText('Progress', { exact: true })).toBeVisible();

    // Issues section heading
    await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();

    // At least one issue row
    await expect(page.locator('[data-testid="issue-row"]').first()).toBeVisible();

    // All mode: both seeded issues visible
    await expect(page.getByText('Smoke project issue A (done)')).toBeVisible();
    await expect(page.getByText('Smoke project issue B (todo)')).toBeVisible();

    // Active toggle: hides done issues, keeps todo issues
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await expect(page.getByText('Smoke project issue A (done)')).toBeHidden();
    await expect(page.getByText('Smoke project issue B (todo)')).toBeVisible();
});

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
