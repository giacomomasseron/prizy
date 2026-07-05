import { expect, test } from '@playwright/test';

test('advanced search: palette footer → filter → save view', async ({ page }) => {
    test.setTimeout(90_000);
    const viewName = `E2E view ${Date.now()}`;

    // Navigate to home and wait for the app shell to mount (so the Ctrl+K listener is registered).
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Search' })).toBeVisible({ timeout: 15_000 });

    // Open the command palette and navigate to Advanced search.
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: /command palette/i })).toBeVisible();
    await page.getByRole('button', { name: /advanced search/i }).click();
    await expect(page).toHaveURL(/\/search/);

    // Browse shows seeded issues without any query.
    await expect(page.getByTestId('search-row').first()).toBeVisible({ timeout: 10_000 });

    // Add a Priority filter.
    await page.getByRole('button', { name: /add filter/i }).click();
    await page.getByRole('menuitem', { name: 'Priority' }).click();

    // Select "Urgent" from the value picker and wait for the filtered API response.
    const filteredResponse = page.waitForResponse(
        (r) =>
            r.url().includes('/v1/search/issues') &&
            (r.url().includes('filter%5Bpriority%5D') || r.url().includes('filter[priority]')),
        { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Urgent' }).click();
    await filteredResponse;

    // Save this view with a unique name.
    await page.getByRole('button', { name: /save this view/i }).click();
    await page.getByPlaceholder(/view name/i).fill(viewName);

    const savedResponse = page.waitForResponse(
        (r) => r.url().includes('/saved-views') && r.request().method() === 'POST',
        { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /^save$/i }).click();
    const resp = await savedResponse;
    expect(resp.status()).toBe(201);

    // The saved view name should appear in the sidebar view list after the mutation invalidates the query.
    await expect(page.getByText(viewName)).toBeVisible({ timeout: 15_000 });
});
