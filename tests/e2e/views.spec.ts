import { expect, test } from '@playwright/test';

test('filter bar: built-in view + custom filter + save/restore/delete saved view', async ({ page }) => {
    test.setTimeout(60_000);

    const VIEW_NAME = `E2E view ${Date.now()}`;

    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. Open Views → My Issues; assert assignee_id appears in URL
    await page.getByRole('button', { name: 'Views' }).click();
    await page.getByRole('menuitem', { name: 'My Issues' }).click();
    await expect(page).toHaveURL(/assignee_id=/);

    // 3. Open + Filter → Status; check "backlog"; assert pill visible + URL has status=
    await page.getByRole('button', { name: '+ Filter' }).click();
    await page.getByRole('menuitem', { name: 'Status' }).click();
    // The Status pill is now shown with its popover open — click "backlog" checkbox
    await expect(page.getByLabel('backlog')).toBeVisible();
    await page.getByLabel('backlog').click();
    await expect(page.getByLabel('backlog')).toBeChecked();
    await expect(page.getByRole('button').filter({ hasText: /Status/ })).toBeVisible();
    await expect(page).toHaveURL(/status=/);

    // 4. Save view — accept the prompt dialog with the unique view name.
    //    Wire up the dialog handler BEFORE clicking so it is in place when the prompt fires.
    const dialogHandler = (dialog: import('@playwright/test').Dialog) => {
        if (dialog.type() === 'prompt') {
            dialog.accept(VIEW_NAME);
        } else {
            dialog.accept();
        }
    };
    page.on('dialog', dialogHandler);

    // Intercept the POST /v1/saved-views response so we can wait for it to complete.
    const saveResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/saved-views') && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save view' }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(201);

    // 5. Wait for the saved-views GET to refetch (invalidation after mutation).
    await page.waitForResponse(
        (response) => response.url().includes('/saved-views') && response.request().method() === 'GET',
    );

    // Open Views menu and assert the new view appears
    await page.getByRole('button', { name: 'Views' }).click();
    await expect(page.getByRole('menuitem', { name: VIEW_NAME })).toBeVisible();
    // Close the menu by clicking elsewhere
    await page.keyboard.press('Escape');

    // 6. Navigate to root (clears URL filters) — then re-apply the saved view
    //    Set up the response waiter BEFORE navigating to avoid a race condition.
    const savedViewsGetPromise = page.waitForResponse(
        (response) => response.url().includes('/saved-views') && response.request().method() === 'GET',
    );
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // After navigating to root, no filters should be active
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // Wait for the saved-views query to load on fresh page render
    await savedViewsGetPromise;

    // Re-apply the saved view from Views menu
    await page.getByRole('button', { name: 'Views' }).click();
    await expect(page.getByRole('menuitem', { name: VIEW_NAME })).toBeVisible();
    await page.getByRole('menuitem', { name: VIEW_NAME }).click();
    // The saved view had status=backlog — assert the Status pill is restored
    await expect(page.getByRole('button').filter({ hasText: /Status/ })).toBeVisible();
    await expect(page).toHaveURL(/status=/);

    // 7. Delete the saved view — confirm dialog already handled by dialogHandler above
    const deleteResponsePromise = page.waitForResponse(
        (response) => response.url().includes('/saved-views') && response.request().method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Views' }).click();
    await page.getByRole('button', { name: `Delete view ${VIEW_NAME}` }).click();
    await deleteResponsePromise;

    // After deletion + refetch, the menu should no longer show the view name
    await page.waitForResponse(
        (response) => response.url().includes('/saved-views') && response.request().method() === 'GET',
    );
    // The menu is still open — view should now be gone
    await expect(page.getByRole('menuitem', { name: VIEW_NAME })).not.toBeVisible();
});
