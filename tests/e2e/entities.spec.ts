import { expect, test } from '@playwright/test';

test('entity management flow: teams → projects → labels → issue labels+project', async ({ page }) => {
    test.setTimeout(60_000);

    const ts = Date.now();
    const TEAM_NAME = `E2E Team ${ts}`;
    const TEAM_IDENT = `ET${String(ts).slice(-3)}`; // e.g. ET123 — [A-Z0-9]{1,8}
    const PROJECT_NAME = `E2E Project ${ts}`;
    const LABEL_NAME = `E2E Label ${ts}`;

    // Start on issues list (pre-authenticated via storageState)
    await page.goto('/');

    // 2. Teams — create a new team via the repointed Settings › Teams flow
    // (R-E-2 removed the old inline /teams create form; "New team" now routes to Settings).
    // The redesigned GlobalSidebar has no top-level "Teams" nav link anymore
    // (teams live under the collapsible "My Teams" tree); go there directly.
    await page.goto('/teams');
    await expect(page).toHaveURL('http://smoke.localhost:8001/teams');
    await page.getByRole('button', { name: 'New team' }).click();
    await expect(page).toHaveURL(/\/settings\/teams/);
    await page.getByRole('button', { name: 'Create team' }).click(); // header button opens the modal
    await page.getByLabel('Team name').fill(TEAM_NAME);
    await page.getByLabel('Identifier').fill(TEAM_IDENT);
    await page.getByRole('dialog').getByRole('button', { name: 'Create team' }).click();
    await expect(page.getByTestId(`team-row-${TEAM_IDENT}`)).toBeVisible();
    // Return to the main app (Settings has its own sub-nav without Projects/Labels links).
    await page.getByRole('button', { name: /Back to app/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 3. Projects — create a project via the /create screen (inline form was removed)
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    await expect(page).toHaveURL(/\/create/);
    await page.getByPlaceholder('Project name').fill(PROJECT_NAME);
    await page.getByRole('button', { name: /Create project/i }).click();
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Go to workspace' }).click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByText(PROJECT_NAME)).toBeVisible({ timeout: 8_000 });

    // 4. Labels — create a label
    await page.goto('http://smoke.localhost:8001/settings/labels');
    await expect(page).toHaveURL(/\/settings\/labels$/);
    await page.getByRole('button', { name: 'New label' }).click();
    await page.getByLabel('Label name').fill(LABEL_NAME);
    await page.getByRole('button', { name: 'Add label' }).click();
    await expect(page.getByText(LABEL_NAME)).toBeVisible();

    // 5. Issues → open the pre-seeded starter issue
    // "Issues" (Workspace group) substring-collides with "My Issues" (Support
    // bridge) under Playwright's default fuzzy name matching — anchor on the
    // leading "Issues" text so this targets the Workspace link unambiguously.
    await page.getByRole('link', { name: /^Issues/ }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');
    // R-C redesign: issue rows are <div data-testid="issue-row">. Click to open peek, then follow "Open full issue →".
    await page.locator('[data-testid="issue-row"]').filter({ hasText: 'Starter issue' }).click();
    await expect(page.getByRole('link', { name: /Open full issue/i })).toBeVisible({ timeout: 8_000 });
    await page.getByRole('link', { name: /Open full issue/i }).click();
    await expect(page).toHaveURL(/\/issues\//);

    // R-C redesign: Labels and Project are now Menu-based editors (no checkboxes/selects).

    // Attach the new label via LabelsEditor Menu (trigger aria-label="Edit labels").
    const labelsBtn = page.getByRole('button', { name: 'Edit labels' });
    await expect(labelsBtn).toBeVisible({ timeout: 8_000 });
    const labelsPut = page.waitForResponse(
        (r) => r.url().includes('/labels') && r.request().method() === 'PUT',
    );
    await labelsBtn.click();
    await page.getByRole('menuitem', { name: LABEL_NAME }).click();
    await labelsPut;

    // Set the project via ProjectEditor Menu (trigger aria-label="Edit project").
    const projectBtn = page.getByRole('button', { name: 'Edit project' });
    await expect(projectBtn).toBeVisible({ timeout: 6_000 });
    const patchReq = page.waitForResponse(
        (r) => r.url().includes('/issues/') && r.request().method() === 'PATCH',
    );
    await projectBtn.click();
    await page.getByRole('menuitem', { name: PROJECT_NAME }).click();
    await patchReq;

    // Wait for both mutations to settle before reloading
    await page.waitForLoadState('networkidle');

    // 6. Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Label chip is rendered inside the "Edit labels" trigger button
    await expect(page.getByRole('button', { name: 'Edit labels' })).toContainText(LABEL_NAME, { timeout: 8_000 });
    // Project pill is rendered inside the "Edit project" trigger button
    await expect(page.getByRole('button', { name: 'Edit project' })).toContainText(PROJECT_NAME, { timeout: 8_000 });
});
