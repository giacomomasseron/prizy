import { expect, test } from '@playwright/test';

test('create project with status via /create', async ({ page }) => {
    test.setTimeout(60_000);
    const ts = Date.now();
    const NAME = `E2E Project ${ts}`;

    await page.goto('/create');
    await expect(page.getByText('New project')).toBeVisible();

    // Fill project name (placeholder is "Project name" without ellipsis)
    await page.getByPlaceholder('Project name').fill(NAME);

    // Pick "In Progress" status chip (plain button — normal .click() works)
    await page.getByRole('button', { name: 'In Progress' }).click();

    // Create button must be enabled once name is filled
    const createBtn = page.getByRole('button', { name: /Create project/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Success card shows "{name} created"
    await expect(page.getByText(`${NAME} created`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /Create another/i })).toBeVisible();

    // Go to workspace → projects list
    await page.getByRole('button', { name: /Go to workspace/i }).click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByText(NAME)).toBeVisible({ timeout: 8_000 });
});

test('create cycle with team + duration via /create?tab=cycle', async ({ page }) => {
    test.setTimeout(60_000);
    const ts = Date.now();
    const NAME = `E2E Cycle ${ts}`;

    await page.goto('/create?tab=cycle');
    await expect(page.getByText('New cycle')).toBeVisible();

    // Fill cycle name (placeholder is "Cycle name")
    await page.getByPlaceholder('Cycle name').fill(NAME);

    // Pick team via the Team picker Menu
    // The trigger button has aria-label="Team picker"; menu items have role="menuitem"
    await page.getByRole('button', { name: 'Team picker' }).click();
    const teamItem = page.getByRole('menuitem', { name: 'Smoke Team' });
    await teamItem.waitFor({ state: 'visible', timeout: 5_000 });
    await teamItem.click();

    // Set starts date so the duration chip can compute ends_at
    await page.getByLabel('Starts').fill('2026-09-01');

    // Duration chip: 2 weeks (plain button)
    await page.getByRole('button', { name: '2 weeks' }).click();

    // ends_at should auto-fill to 2026-09-15 (2026-09-01 + 14 days)
    await expect(page.getByLabel('Ends')).toHaveValue('2026-09-15', { timeout: 3_000 });

    // Create cycle button must be enabled (name + team + valid dates are all set)
    const createBtn = page.getByRole('button', { name: /Create cycle/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Success card appears
    await expect(page.getByText(`${NAME} created`)).toBeVisible({ timeout: 10_000 });

    // Go to workspace → team detail page
    await page.getByRole('button', { name: /Go to workspace/i }).click();
    await expect(page).toHaveURL(/\/teams\//);
});
