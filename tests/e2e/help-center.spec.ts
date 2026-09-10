import { expect, test } from '@playwright/test';

test.describe('Help center (public)', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // public — no login

    test('browses from home to an article and sees the feedback prompt', async ({ page }) => {
        await page.goto('/help');
        await expect(page.getByRole('heading', { name: 'How can we help?' })).toBeVisible();
        await expect(page.getByText('Browse by topic')).toBeVisible();

        await page.getByRole('link', { name: /Getting started/ }).click();
        await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();

        await page.getByRole('link', { name: 'Create your first project' }).first().click();
        await expect(page.getByRole('heading', { name: 'Create your first project' })).toBeVisible();
        await expect(page.getByText('Was this helpful?')).toBeVisible();
    });

    test('search finds a seeded article', async ({ page }) => {
        await page.goto('/help');
        await page.getByPlaceholder(/Search articles/).fill('escalations');
        await page.getByRole('button', { name: 'Search' }).click();
        await expect(page.getByRole('link', { name: /Understanding escalations/ })).toBeVisible();
    });
});
