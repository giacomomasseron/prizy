import { expect, test } from '@playwright/test';

test.describe('Analytics', () => {
    test('shows overview KPIs and switches to cycles', async ({ page }) => {
        await page.goto('/analytics');
        await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
        await expect(page.getByText('Issues created')).toBeVisible();
        await expect(page.getByText('Issue flow')).toBeVisible();

        await page.getByRole('button', { name: 'Cycles' }).click();
        await expect(page.getByText('Velocity')).toBeVisible();
        await expect(page.getByText('Burndown')).toBeVisible();
    });
});
