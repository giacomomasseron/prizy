import { expect, test } from '@playwright/test';

test('notifications: bell badge, dropdown, mark all read, /notifications page', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. Assert the bell shows an unread badge (the seeded notification).
    //    Wait for the unread-count API to respond before asserting the badge.
    await page.waitForResponse(
        (response) => response.url().includes('/notifications/unread-count') && response.request().method() === 'GET',
    );
    const bell = page.getByRole('button', { name: 'Notifications' });
    await expect(bell).toBeVisible();
    // The badge is a <span> inside the bell button showing the count (only rendered when count > 0)
    const badge = bell.locator('span');
    await expect(badge).toBeVisible();

    // 3. Open the dropdown and assert a notification row is visible
    await bell.click();
    await expect(page.getByText('You were assigned an issue')).toBeVisible();

    // 4. Click "Mark all read" and assert the badge disappears
    const markAllReadBtn = page.getByRole('button', { name: 'Mark all read' });
    // Set up waiters BEFORE clicking to avoid race conditions
    const markAllReadResponse = page.waitForResponse(
        (response) => response.url().includes('/notifications/read-all') && response.request().method() === 'POST',
    );
    const unreadCountRefetch = page.waitForResponse(
        (response) => response.url().includes('/notifications/unread-count') && response.request().method() === 'GET',
    );
    await markAllReadBtn.click();
    await markAllReadResponse;
    await unreadCountRefetch;

    // Badge span is conditionally rendered only when count > 0 — assert it's gone
    await expect(badge).toHaveCount(0);

    // 5. Navigate to /notifications page via "See all →" link.
    //    The dropdown is still open after mark-all-read (no setOpen(false) was called).
    await page.getByText('See all →').click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByText('You were assigned an issue')).toBeVisible();
});
