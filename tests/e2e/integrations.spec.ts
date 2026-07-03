import { expect, test } from '@playwright/test';

test('integrations: configure Slack and persist', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    await page.getByRole('link', { name: 'Integrations' }).click();
    await expect(page).toHaveURL(/\/integrations/);

    await page.getByLabel('Slack webhook URL').fill('https://hooks.slack.com/services/T0/B0/exampletoken');
    await page.getByLabel('Assigned').check();

    const putResp = page.waitForResponse((r) => r.url().includes('/integrations/slack') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save' }).click();
    await putResp;
    await expect(page.getByText('Saved')).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Slack webhook URL')).toHaveAttribute('placeholder', /Configured/);
    await expect(page.getByLabel('Assigned')).toBeChecked();
});
