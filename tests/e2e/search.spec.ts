import { expect, test } from '@playwright/test';

test('search: ⌘K finds a seeded issue and navigates; /search shows results', async ({ page }) => {
    test.setTimeout(60_000);

    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // Grab the seeded issue's title from the list (SmokeSeeder creates a starter issue).
    const firstIssue = page.locator('a[href^="/issues/"]').first();
    await expect(firstIssue).toBeVisible();
    const title = (await firstIssue.textContent())?.trim() ?? '';
    const term = title.split(' ')[0];

    // Open ⌘K and search.
    await page.keyboard.press('Meta+k');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox').fill(term);
    const hit = dialog.getByText(title, { exact: false }).first();
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(page).toHaveURL(/\/issues\//);

    // Full page.
    await page.goto(`/search?q=${encodeURIComponent(term)}`);
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible();
});
