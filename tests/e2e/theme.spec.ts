import { expect, test } from '@playwright/test';

test('theme toggle persists across reload and changes computed background', async ({ page }) => {
    test.setTimeout(60_000);

    // Start on issues list (pre-authenticated via storageState)
    await page.goto('/');

    // 2. Assert initial theme is dark (data-theme attribute on <html>)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 3. Record background-color in dark mode (main element bg: var(--bg) = #0b0b0d)
    const mainDark = await page.locator('html').evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--bg').trim(),
    );
    expect(mainDark).toBe('#0b0b0d');

    // 3b. Assert the body is ACTUALLY PAINTED with the dark background color
    // This will fail if Fix 1 (html,body{background:var(--bg)}) regresses.
    const bodyBgDark = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor,
    );
    // #0b0b0d = rgb(11, 11, 13)
    expect(bodyBgDark).toBe('rgb(11, 11, 13)');

    // 4. Click the theme toggle in the sidebar
    await page.getByRole('button', { name: /switch to light theme/i }).click();

    // 5. Assert data-theme flipped to light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 6. Assert --bg CSS var changed to light value
    const mainLight = await page.locator('html').evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--bg').trim(),
    );
    expect(mainLight).toBe('#fbfbfa');

    // 6b. Assert the body is ACTUALLY PAINTED with the light background color
    // This will fail if Fix 1 (html,body{background:var(--bg)}) regresses.
    const bodyBgLight = await page.evaluate(() =>
        getComputedStyle(document.body).backgroundColor,
    );
    // #fbfbfa = rgb(251, 251, 250)
    expect(bodyBgLight).toBe('rgb(251, 251, 250)');

    // 7. Reload — theme must persist (no-flash script reads localStorage)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // 8. Toggle back to dark
    await page.getByRole('button', { name: /switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
