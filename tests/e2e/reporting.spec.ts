import { test, expect } from '@playwright/test';

test('agent reaches reporting from the desk rail and sees the overview', async ({ page }) => {
    await page.goto('/support');
    await page.getByRole('link', { name: 'Reporting' }).click();
    await expect(page).toHaveURL(/\/support\/reporting$/);

    // KPI cards + overview charts render from the seeded historical tickets.
    await expect(page.getByText('Tickets created')).toBeVisible();
    await expect(page.getByText('Median first reply')).toBeVisible();
    await expect(page.getByText('Ticket volume')).toBeVisible();
    await expect(page.getByText('Tickets by status')).toBeVisible();
    await expect(page.getByText('Escalations to engineering')).toBeVisible();

    // Range toggle still works.
    await page.getByRole('button', { name: '30d' }).click();
    await expect(page.getByText('Ticket volume')).toBeVisible();
});
