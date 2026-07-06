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
    //    The SmokeSeeder now seeds a scheduled project ("Smoke Roadmap Project"
    //    with start_date + target_date), so the redesigned timeline card always
    //    renders at least one bar. (An earlier multi-state .or() check became
    //    ambiguous once dateless projects from other specs also render an
    //    "Unscheduled" section — two matches tripped Playwright strict mode.)
    await expect(page.locator('[data-testid^="bar-"]').first()).toBeVisible();
});
