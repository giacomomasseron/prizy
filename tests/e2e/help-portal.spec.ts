import { expect, test } from '@playwright/test';

test.describe('Help portal (guest)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects guests from My requests to the sign-in page', async ({ page }) => {
        await page.goto('/help/requests');
        await expect(page).toHaveURL(/\/help\/login$/);
        await expect(page.getByRole('heading', { name: 'Sign in to view your requests' })).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
    });

    test('help home offers Sign in and hides request surfaces for guests', async ({ page }) => {
        await page.goto('/help');
        await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
        await expect(page.getByText('Your recent requests')).not.toBeVisible();
    });

    test('redirects guests from the submit form to sign-in', async ({ page }) => {
        await page.goto('/help/new');
        await expect(page).toHaveURL(/\/help\/login$/);
        await expect(page.getByRole('heading', { name: 'Sign in to view your requests' })).toBeVisible();
    });
});
