import { expect, test } from '@playwright/test';

test('search: ⌘K finds a seeded issue and navigates; /search shows results', async ({ page }) => {
    test.setTimeout(60_000);

    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // Grab the seeded issue's title from the list.
    // R-B redesign: issue rows are <div data-testid="issue-row">, not <a> links.
    // SmokeSeeder always seeds a "Starter issue"; use the known title rather
    // than trying to parse it out of the row's concatenated textContent.
    const title = 'Starter issue';
    const term = title.split(' ')[0]; // 'Starter'
    await expect(page.locator('[data-testid="issue-row"]').filter({ hasText: title }).first()).toBeVisible({ timeout: 10_000 });

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
