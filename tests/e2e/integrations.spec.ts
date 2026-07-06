import { expect, test } from '@playwright/test';

test('integrations: configure Slack and persist', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Integrations' }).click();
    await expect(page).toHaveURL(/\/settings\/integrations/);

    // open the Slack config drawer (Connect if Available, Manage if already Connected)
    await page.getByTestId('connect-slack').or(page.getByTestId('manage-slack')).click();
    await page.getByLabel('Slack webhook URL').fill('https://hooks.slack.com/services/T0/B0/exampletoken');
    await page.getByLabel('Assigned').check();

    const putResp = page.waitForResponse((r) => r.url().includes('/integrations/slack') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await putResp;
    await expect(page.getByText('Saved')).toBeVisible();

    // reload; Slack is now Connected — re-open via the card and assert persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('manage-slack').or(page.getByTestId('connect-slack')).click();
    await expect(page.getByLabel('Slack webhook URL')).toHaveAttribute('placeholder', /Configured/);
    await expect(page.getByLabel('Assigned')).toBeChecked();
});
