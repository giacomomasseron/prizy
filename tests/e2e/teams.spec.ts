import { expect, test } from '@playwright/test';

test('settings teams: create a team, add a member, promote to lead, remove', async ({ page }) => {
    test.setTimeout(90_000);
    const ident = `E${Date.now().toString().slice(-5)}`; // unique identifier per run

    await page.goto('/settings/teams');
    await expect(page).toHaveURL(/\/settings\/teams/);

    // Create a team
    await page.getByRole('button', { name: 'Create team' }).click();
    await page.getByLabel('Team name').fill(`Playwright ${ident}`);
    await page.getByLabel('Identifier').fill(ident);
    const createResp = page.waitForResponse(
        (r) => r.url().includes('/v1/teams') && r.request().method() === 'POST',
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Create team' }).click();
    await createResp;
    await expect(page.getByTestId(`team-row-${ident}`)).toBeVisible();

    // Open the drawer, add the seeded member
    await page.getByTestId(`team-row-${ident}`).click();
    await page.getByRole('button', { name: /add member/i }).click();
    const addResp = page.waitForResponse(
        (r) => r.url().includes('/members') && r.request().method() === 'POST',
    );
    await page.getByText('member@example.com').click();
    await addResp;
    await expect(page.getByTestId('team-member-member@example.com')).toBeVisible();

    // Promote to Lead
    await page.getByTestId('role-btn-member@example.com').click();
    const roleResp = page.waitForResponse(
        (r) => /\/members\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH',
    );
    await page.getByRole('menuitem', { name: 'Lead' }).click();
    await roleResp;

    // Remove the member
    const delResp = page.waitForResponse(
        (r) => /\/members\/[^/]+$/.test(r.url()) && r.request().method() === 'DELETE',
    );
    await page.getByTestId('remove-member@example.com').click();
    await delResp;
    await expect(page.getByTestId('team-member-member@example.com')).not.toBeVisible();
});
