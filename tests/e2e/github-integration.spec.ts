import { expect, test } from '@playwright/test';

test('github: configure integration + link a PR', async ({ page }) => {
    // precondition: smoke@example.com is seeded as owner (SmokeSeeder) so the Integrations menuitem renders
    test.setTimeout(60_000);

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // Navigate via sidebar user menu → Integrations
    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Integrations' }).click();
    await expect(page).toHaveURL(/\/integrations/);

    await page.getByLabel('GitHub webhook secret').fill('test-secret');
    await page.getByLabel('Move linked issue to Done on PR merge').click();
    const put = page.waitForResponse((r) => r.url().includes('/integrations/github') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save GitHub' }).click();
    await put;
    await expect(page.getByText('Saved')).toBeVisible();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('GitHub webhook URL')).toHaveValue(/\/integrations\/github\/webhook\//);

    // Link a PR on the first issue
    await page.goto('/');
    // R-B redesign: issue rows are <div data-testid="issue-row">, not <a> links.
    // Click the row to open the peek drawer, then follow "Open full issue →".
    await page.locator('[data-testid="issue-row"]').first().click();
    await expect(page.getByRole('link', { name: /Open full issue/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('link', { name: /Open full issue/i }).click();
    await expect(page).toHaveURL(/\/issues\//);
    await page.getByLabel('Add PR URL').fill('https://github.com/acme/app/pull/1');
    await page.getByRole('button', { name: 'Add PR' }).click();
    await expect(page.getByText('acme/app #1')).toBeVisible();
});
