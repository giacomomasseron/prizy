import { expect, test } from '@playwright/test';

test('theme defaults to light, toggles to dark, and persists across reloads', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');

    // Light is the default (nothing stored in the storageState).
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--bg').trim())).toBe('#fbf6ea');
    // The body is actually painted with the token (guards html,body{background:var(--bg)}).
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(251, 246, 234)');

    await page.getByRole('button', { name: /switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).getPropertyValue('--bg').trim())).toBe('#16140f');
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(22, 20, 15)');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: /switch to light theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
