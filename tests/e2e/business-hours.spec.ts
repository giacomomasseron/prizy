import { expect, test } from '@playwright/test';

test('agent creates a business-hours schedule from settings', async ({ page }) => {
    const NAME = `E2E Hours ${Date.now()}`;

    await page.goto('/settings/business-hours');
    await expect(page).toHaveURL(/\/settings\/business-hours$/);
    await expect(page.getByRole('heading', { name: 'Business hours' })).toBeVisible();

    await page.getByRole('button', { name: 'New schedule' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Schedule name').fill(NAME);
    await page.getByLabel('Monday open', { exact: true }).check();

    const createResp = page.waitForResponse(
        (r) => r.url().includes('/v1/business-hours') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Create schedule' }).click();
    await createResp;

    // Modal closes on success, so the name now appears once, in the list row.
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(NAME)).toBeVisible();
});
