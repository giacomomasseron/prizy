import { expect, test } from '@playwright/test';

test('settings: email digest frequency persists after reload', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. Navigate to /settings via the ⚙ link
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);

    // 3. Set Email digest frequency to Daily
    const select = page.getByLabel('Email digest frequency');
    await expect(select).toBeVisible();

    // Wait for the PATCH /notifications/preferences response before asserting "Saved"
    const patchResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes('/notifications/preferences') &&
            response.request().method() === 'PATCH',
    );
    await select.selectOption('daily');
    await patchResponsePromise;

    // 4. Assert "Saved" feedback appears
    await expect(page.getByText('Saved')).toBeVisible();

    // 5. Reload and assert the preference persisted (select still shows daily via /me)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Email digest frequency')).toHaveValue('daily');
});
