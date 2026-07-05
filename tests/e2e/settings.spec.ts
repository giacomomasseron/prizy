import { expect, test } from '@playwright/test';

test('settings: email digest frequency persists after reload', async ({ page }) => {
    test.setTimeout(60_000);

    // Navigate directly to /settings/general (owner is redirected to /settings/members
    // from the bare /settings route, so go straight to general)
    await page.goto('/settings/general');

    // Set Email digest frequency to Daily
    const select = page.getByLabel('Email digest frequency');
    await expect(select).toBeVisible();

    const patchResponsePromise = page.waitForResponse(
        (response) =>
            response.url().includes('/notifications/preferences') &&
            response.request().method() === 'PATCH',
    );
    await select.selectOption('daily');
    await patchResponsePromise;

    // Assert "Saved" feedback appears
    await expect(page.getByText('Saved')).toBeVisible();

    // Reload and assert the preference persisted
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Email digest frequency')).toHaveValue('daily');
});

test('settings members: navigate, toggle capability, change level, invite, remove invited', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');

    // Navigate to Members via user-menu → Settings
    await page.getByTestId('user-menu-trigger').click();
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings\/members/);

    // Smoke Member row is visible
    await expect(page.getByText('Smoke Member')).toBeVisible();

    // Toggle Developer capability (off) → PATCH fires
    const patchPromise1 = page.waitForResponse(
        r => r.url().includes('/v1/members/') && r.request().method() === 'PATCH',
    );
    await page.getByTestId('cap-developer-member@example.com').click();
    await patchPromise1;

    // Change level via Menu to Viewer
    const patchPromise2 = page.waitForResponse(
        r => r.url().includes('/v1/members/') && r.request().method() === 'PATCH',
    );
    await page.getByTestId('level-btn-member@example.com').click();
    await page.getByRole('menuitem', { name: 'Viewer' }).click();
    await patchPromise2;

    // Invite a new person with a unique email
    const inviteEmail = `playwright-invite-${Date.now()}@example.com`;
    await page.getByRole('button', { name: 'Invite people' }).click();

    // Fill email in the modal
    await page.getByLabel(/email/i).fill(inviteEmail);

    // Select Admin level chip (scoped to dialog to avoid ambiguity)
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Admin' }).click();

    // Send the invite
    const invitePromise = page.waitForResponse(
        r => r.url().includes('/invitations') && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: /send invite/i }).click();
    await invitePromise;

    // Invited row appears in the list
    await expect(page.getByText(inviteEmail)).toBeVisible();
    await expect(page.getByText('Invited')).toBeVisible();

    // Remove (cancel) the invited row
    const deletePromise = page.waitForResponse(
        r => r.url().includes('/invitations/') && r.request().method() === 'DELETE',
    );
    await page.getByTestId(`remove-${inviteEmail}`).click();
    await deletePromise;

    await expect(page.getByText(inviteEmail)).not.toBeVisible();
});
