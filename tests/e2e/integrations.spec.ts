import { expect, test } from '@playwright/test';

test('integrations: configure Slack and persist', async ({ page }) => {
    // precondition: smoke@example.com is seeded as owner (SmokeSeeder) so the Integrations menuitem renders
    test.setTimeout(60_000);

    // Start on issues list (pre-authenticated via storageState)
    await page.goto('/');

    // Navigate via sidebar user menu → Integrations
    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Integrations' }).click();
    await expect(page).toHaveURL(/\/integrations/);

    await page.getByLabel('Slack webhook URL').fill('https://hooks.slack.com/services/T0/B0/exampletoken');
    await page.getByLabel('Assigned').check();

    const putResp = page.waitForResponse((r) => r.url().includes('/integrations/slack') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await putResp;
    await expect(page.getByText('Saved')).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Slack webhook URL')).toHaveAttribute('placeholder', /Configured/);
    await expect(page.getByLabel('Assigned')).toBeChecked();
});
