import { expect, test } from '@playwright/test';

test('agent creates an SLA policy from settings', async ({ page }) => {
    const NAME = `E2E Policy ${Date.now()}`;

    await page.goto('/settings/sla-policies');
    await expect(page).toHaveURL(/\/settings\/sla-policies$/);
    await expect(page.getByRole('heading', { name: 'SLA policies' })).toBeVisible();

    await page.getByRole('button', { name: 'New policy' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Policy name').fill(NAME);
    await page.getByLabel('First reply minutes').fill('60');
    await page.getByLabel('Resolution minutes').fill('480');
    // Leave schedule = "24/7 (no schedule)" (the default select value).

    const createResp = page.waitForResponse(
        (r) => r.url().includes('/v1/sla-policies') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Create policy' }).click();
    await createResp;

    // Modal closes on success, so the name now appears once, in the list row.
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(NAME)).toBeVisible();
});
