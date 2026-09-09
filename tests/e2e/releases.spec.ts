import { expect, test } from '@playwright/test';

test.describe('Releases', () => {
    test('create → appears upcoming → mark shipped → appears shipped', async ({ page }) => {
        const name = `E2E Release ${Date.now()}`;
        await page.goto('/releases');
        await expect(page.getByRole('heading', { name: 'Releases' })).toBeVisible();

        await page.getByRole('button', { name: '+ New release' }).click();
        await page.getByLabel('Name').fill(name);
        await page.getByRole('button', { name: 'Create release' }).click();
        await expect(page.getByRole('heading', { name })).toBeVisible();

        await page.getByRole('button', { name: 'Mark shipped' }).click();
        await expect(page.getByRole('button', { name: 'Unship' })).toBeVisible();

        await page.goto('/releases');
        await expect(page.getByText('Shipped', { exact: true })).toBeVisible();
        await expect(page.getByTestId('releases-shipped').getByRole('link', { name: new RegExp(name) })).toBeVisible();
    });
});
