import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

async function login(page, email: string) {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
}

test('agent-only user is kept out of the tracker and lands on the support desk', async ({ page }) => {
    await login(page, 'agent-maya@example.com');
    // Redirected off the tracker to the desk.
    await expect(page).toHaveURL('http://smoke.localhost:8001/support');
    // No tracker nav in the sidebar.
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /New issue/ })).toHaveCount(0);
    // Deep-linking a tracker route bounces back to the desk.
    await page.goto('/projects');
    await expect(page).toHaveURL('http://smoke.localhost:8001/support');
});

test('a developer still gets the issue tracker', async ({ page }) => {
    await login(page, 'member@example.com');
    await expect(page).toHaveURL('http://smoke.localhost:8001/');
    await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /New issue/ })).toBeVisible();
});
