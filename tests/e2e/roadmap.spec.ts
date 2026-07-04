import { expect, test } from '@playwright/test';

test('roadmap: navigate via nav link and assert heading visible', async ({ page }) => {
    test.setTimeout(60_000);

    // Start on issues list (pre-authenticated via storageState)
    await page.goto('/');

    // 2. Click the Roadmap nav link
    await page.getByRole('link', { name: 'Roadmap' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/roadmap');

    // 3. The "Roadmap" heading must be visible (robust even with no seeded projects)
    await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();

    // 4. Accept any of three valid roadmap states:
    //    a) No projects exist  → "No projects yet." empty-state text
    //    b) Scheduled project  → at least one [data-testid^="bar-"] rendered
    //    c) Unscheduled project (e.g. created by entities.spec with no dates)
    //       → "Unscheduled" section heading is visible, no bars rendered
    const noProjects = page.getByText('No projects yet.');
    const firstBar = page.locator('[data-testid^="bar-"]').first();
    const unscheduledSection = page.getByRole('heading', { name: /Unscheduled/i });
    await expect(noProjects.or(firstBar).or(unscheduledSection)).toBeVisible();
});
