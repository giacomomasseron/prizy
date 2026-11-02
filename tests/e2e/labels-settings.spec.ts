import { expect, test } from '@playwright/test';

test('settings labels: stats grid + create a grouped label', async ({ page }) => {
    test.setTimeout(60_000);
    const NAME = `E2E ${Date.now()}`;

    await page.goto('http://smoke.localhost:8001/settings/labels');
    await expect(page).toHaveURL(/\/settings\/labels$/);

    // stats grid renders
    await expect(page.getByText('Total labels')).toBeVisible();
    await expect(page.getByTestId('stat-total')).toBeVisible();

    // create a label assigned to a group
    await page.getByRole('button', { name: 'New label' }).click();
    await page.getByLabel('Label name').fill(NAME);
    await page.getByLabel('Label group').fill('Type');
    await page.getByRole('button', { name: 'Add label' }).click();

    // the created label + its exclusive-group badge render
    await expect(page.getByText(NAME)).toBeVisible();
    await expect(page.getByText('Group · one of').first()).toBeVisible();
});
