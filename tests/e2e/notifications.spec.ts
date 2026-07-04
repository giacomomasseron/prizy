import { expect, test } from '@playwright/test';

test('notifications: inbox badge, /notifications page, mark all read', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. The Inbox nav link is always present in the sidebar regardless of unread count
    await expect(page.getByRole('link', { name: 'Inbox' })).toBeVisible();

    // 2b. Inbox badge only renders when unread > 0 — gate the check on the API response
    const unreadResp = await page.waitForResponse(
        (response) => response.url().includes('/notifications/unread-count') && response.request().method() === 'GET',
    );
    const unreadData = await unreadResp.json();
    if ((unreadData?.data?.count ?? 0) > 0) {
        await expect(page.getByTestId('inbox-badge')).toBeVisible();
    }

    // 3. Click Inbox nav link → navigate to /notifications
    await page.getByRole('link', { name: 'Inbox' }).click();
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByText('You were assigned an issue')).toBeVisible();

    // 4. Click "Mark all read" on the /notifications page
    const markAllReadResponse = page.waitForResponse(
        (response) => response.url().includes('/notifications/read-all') && response.request().method() === 'POST',
    );
    const unreadCountRefetch = page.waitForResponse(
        (response) => response.url().includes('/notifications/unread-count') && response.request().method() === 'GET',
    );
    await page.getByRole('button', { name: 'Mark all read' }).click();
    await markAllReadResponse;
    await unreadCountRefetch;

    // 5. Navigate back to issues list; inbox badge should now be hidden (count = 0)
    await page.getByRole('link', { name: 'Issues' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');
    await expect(page.getByTestId('inbox-badge')).not.toBeVisible();
});
