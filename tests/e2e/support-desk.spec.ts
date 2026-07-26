import { test, expect } from '@playwright/test';

test('agent desk: gated, lists tickets, reads a conversation', async ({ page }) => {
    await page.goto('/support');
    // Agent (smoke owner) reaches the desk
    await expect(page.getByText('Agent workspace')).toBeVisible();
    await expect(page.getByText('Escalated issue shows blank customer profile')).toBeVisible();
    // Open the ticket → conversation renders the seeded messages
    await page.getByText('Escalated issue shows blank customer profile').first().click();
    await expect(page).toHaveURL(/\/support\/tickets\//);
    await expect(page.getByText('reproduced, escalating to engineering', { exact: false })).toBeVisible();
    // Context: requester + org
    await expect(page.getByText('Grace Okonkwo').first()).toBeVisible();
    await expect(page.getByText('Northwind Traders').first()).toBeVisible();
});
