import { expect, test } from '@playwright/test';

test('github: configure integration + link a PR', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Integrations' }).click();
    await expect(page).toHaveURL(/\/settings\/integrations/);

    await page.getByTestId('connect-github').or(page.getByTestId('manage-github')).click();
    await page.getByLabel('GitHub webhook secret').fill('test-secret');
    await page.getByLabel('Move linked issue to Done on PR merge').click();
    const put = page.waitForResponse((r) => r.url().includes('/integrations/github') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save GitHub' }).click();
    await put;
    await expect(page.getByText('Saved')).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('manage-github').or(page.getByTestId('connect-github')).click();
    await expect(page.getByLabel('GitHub webhook URL')).toHaveValue(/\/integrations\/github\/webhook\//);

    // Link a PR on the first issue (unchanged — independent of the integrations move)
    await page.goto('/');
    await page.locator('[data-testid="issue-row"]').first().click();
    await expect(page.getByRole('link', { name: /Open full issue/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('link', { name: /Open full issue/i }).click();
    await expect(page).toHaveURL(/\/issues\//);
    await page.getByLabel('Add PR URL').fill('https://github.com/acme/app/pull/1');
    await page.getByRole('button', { name: 'Add PR' }).click();
    await expect(page.getByText('acme/app #1')).toBeVisible();
});
