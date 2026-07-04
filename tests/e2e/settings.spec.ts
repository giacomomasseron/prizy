import { expect, test } from '@playwright/test';

test('settings: email digest frequency persists after reload', async ({ page }) => {
    test.setTimeout(60_000);

    // Start on issues list (pre-authenticated via storageState)
    await page.goto('/');

    // 2. Navigate to /settings via the sidebar user-menu → Settings
    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);

    // 3. Set Email digest frequency to Daily
    const select = page.getByLabel('Email digest frequency');
    await expect(select).toBeVisible();

    const patchResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes('/notifications/preferences') &&
            response.request().method() === 'PATCH',
    );
    await select.selectOption('daily');
    await patchResponsePromise;

    // 4. Assert "Saved" feedback appears
    await expect(page.getByText('Saved')).toBeVisible();

    // 5. Reload and assert the preference persisted
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Email digest frequency')).toHaveValue('daily');
});
