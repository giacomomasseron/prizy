import { expect, test } from '@playwright/test';

test('entity management flow: teams → projects → labels → issue labels+project', async ({ page }) => {
    test.setTimeout(60_000);

    const ts = Date.now();
    const TEAM_NAME = `E2E Team ${ts}`;
    const TEAM_IDENT = `ET${String(ts).slice(-3)}`; // e.g. ET123 — [A-Z0-9]{1,8}
    const PROJECT_NAME = `E2E Project ${ts}`;
    const LABEL_NAME = `E2E Label ${ts}`;

    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. Teams — create a new team
    await page.getByRole('link', { name: 'Teams' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/teams');
    await page.getByLabel('Team name').fill(TEAM_NAME);
    await page.getByLabel('Team identifier').fill(TEAM_IDENT);
    await page.getByRole('button', { name: 'Add team' }).click();
    await expect(page.getByText(TEAM_NAME)).toBeVisible();

    // 3. Projects — create a project linked to the new team
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/projects');
    await page.getByLabel('Project name').fill(PROJECT_NAME);
    // Wait for the new team to appear in the team select before picking it
    await expect(page.getByLabel('Project team')).toContainText(TEAM_NAME);
    await page.getByLabel('Project team').selectOption({ label: TEAM_NAME });
    await page.getByRole('button', { name: 'Add project' }).click();
    await expect(page.getByText(PROJECT_NAME)).toBeVisible();

    // 4. Labels — create a label
    await page.getByRole('link', { name: 'Labels' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/labels');
    await page.getByLabel('Label name').fill(LABEL_NAME);
    await page.getByRole('button', { name: 'Add label' }).click();
    await expect(page.getByText(LABEL_NAME)).toBeVisible();

    // 5. Issues → open the pre-seeded starter issue
    await page.getByRole('link', { name: 'Issues' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');
    // R-B redesign: issue rows are <div data-testid="issue-row">, not <a> links.
    // Click the row to open the peek drawer, then follow "Open full issue →".
    await page.locator('[data-testid="issue-row"]').filter({ hasText: 'Starter issue' }).click();
    await expect(page.getByRole('link', { name: /Open full issue/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('link', { name: /Open full issue/i }).click();
    await expect(page).toHaveURL(/\/issues\//);

    // Attach the new label. The checkbox is a React controlled component — the
    // checked state is only updated after the mutation round-trip, so we use
    // click() (which does not assert post-click state) and then separately
    // assert toBeChecked() which retries until the query refetch lands.
    await expect(page.getByLabel(LABEL_NAME)).toBeVisible();
    await page.getByLabel(LABEL_NAME).click();
    await expect(page.getByLabel(LABEL_NAME)).toBeChecked();

    // Set the project
    await expect(page.getByLabel('Issue project')).toContainText(PROJECT_NAME);
    await page.getByLabel('Issue project').selectOption({ label: PROJECT_NAME });

    // Wait for both mutations to settle before reloading
    await page.waitForLoadState('networkidle');

    // 6. Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(LABEL_NAME)).toBeChecked();
    await expect(page.getByLabel('Issue project')).not.toHaveValue('');
});
