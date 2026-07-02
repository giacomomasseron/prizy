import { expect, test } from '@playwright/test';

test('roadmap: navigate via nav link and assert heading visible', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. Click the Roadmap nav link
    await page.getByRole('link', { name: 'Roadmap' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/roadmap');

    // 3. The "Roadmap" heading must be visible (robust even with no seeded projects)
    await expect(page.getByRole('heading', { name: 'Roadmap' })).toBeVisible();

    // 4. If the seeder produced a scheduled project, its bar will be rendered;
    //    otherwise the "No projects yet." message appears — both are acceptable.
    const noProjects = page.getByText('No projects yet.');
    const firstBar = page.locator('[data-testid^="bar-"]').first();
    // One of the two must be true: either a bar is visible or the empty-state text is
    await expect(noProjects.or(firstBar)).toBeVisible();
});
