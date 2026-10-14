import { expect, test, type Page } from '@playwright/test';

// P7-B: My to-dos on Today (pre-authenticated as the smoke owner via storageState).
test('adds a to-do that survives a reload, ticks it into Done, clears it, and deletes another', async ({ page }) => {
    const first = `E2E to-do ${Date.now()}`;
    const second = `${first} (delete me)`;
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('your day.');

    const box = page.getByRole('combobox', { name: 'Add a to-do' });
    await box.fill(first);
    await box.press('Enter');
    await expect(page.getByRole('list', { name: 'Open to-dos' }).getByText(first)).toBeVisible();

    // The list lives on the server, not in the browser.
    await page.reload();
    await expect(page.getByRole('list', { name: 'Open to-dos' }).getByText(first)).toBeVisible();

    await page.getByRole('checkbox', { name: first }).check();
    await expect(page.getByRole('list', { name: 'Done to-dos' }).getByText(first)).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText(first, { exact: true })).toHaveCount(0);

    await box.fill(second);
    await box.press('Enter');
    const row = page.getByTestId('todo-row').filter({ hasText: second });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete to-do' }).click();
    await expect(page.getByText(second)).toHaveCount(0);
});

test('@ in the add box offers people, and Enter inserts one', async ({ page }) => {
    await page.goto('/today');
    const box = page.getByRole('combobox', { name: 'Add a to-do' });
    await box.fill('Ask @');

    const people = page.getByRole('listbox', { name: 'Mentions' }).getByRole('group', { name: 'People' });
    await expect(people.getByRole('option').first()).toBeVisible();
    await box.press('Enter');

    await expect(box).toHaveValue(/^Ask @\S.* $/);
    await expect(page.getByRole('listbox', { name: 'Mentions' })).toHaveCount(0);
});

// Today v2: the day plan. The smoke owner has nothing assigned, so the test stars two new issues: starred issues are
// suggested too.
async function createStarredIssue(page: Page, title: string) {
    await page.goto('/issues');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('c');
    await expect(page.getByLabel(/Issue title/i)).toBeVisible({ timeout: 6_000 });
    try {
        const teamPicker = page.getByRole('button', { name: /Issue team/i });
        await teamPicker.waitFor({ state: 'visible', timeout: 3_000 });
        await teamPicker.click();
        await page.getByRole('menuitem', { name: 'Smoke Team' }).click();
    } catch {
        // Single-team workspace: the team is already picked.
    }
    await page.getByLabel(/Issue title/i).fill(title);
    await expect(page.getByRole('button', { name: /Create issue/i })).not.toBeDisabled({ timeout: 5_000 });
    const created = page.waitForResponse((r) => r.url().includes('/issues') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Create issue/i }).click();
    const { data } = await (await created).json();
    // The issue page has one Star button (list rows carry their own star toggles).
    await page.goto(`/issues/${data.id}`);
    await page.getByRole('button', { name: 'Star', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Starred', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

test('plans two starred issues, reorders them, marks one done and undoes it, and sets the daily focus time', async ({ page }) => {
    test.setTimeout(90_000);
    const first = `E2E plan A ${Date.now()}`;
    const second = `E2E plan B ${Date.now()}`;
    await createStarredIssue(page, first);
    await createStarredIssue(page, second);

    await page.goto('/today');
    const suggestions = page.getByRole('list', { name: 'Could also fit today' });
    await suggestions.getByRole('button', { name: `Add to today: ${first}` }).click();
    await suggestions.getByRole('button', { name: `Add to today: ${second}` }).click();
    const plan = page.getByRole('list', { name: 'Today’s plan' });
    await expect(plan.getByTestId('plan-row')).toHaveCount(2);

    // The plan lives on the server, not in the browser.
    await page.reload();
    const rows = plan.getByTestId('plan-row');
    await expect(rows.nth(0)).toContainText(first);
    await expect(rows.nth(0)).toContainText('Start here');
    await expect(page.getByTestId('today-badge')).toHaveText('2');

    // Reorder from the keyboard: the second becomes the focus.
    await rows.nth(0).getByRole('button', { name: 'Reorder' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(rows.nth(0)).toContainText(second);
    await page.reload();
    await expect(rows.nth(0)).toContainText(second);

    // Done completes the issue; Undo puts it back.
    await rows.nth(0).getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByText('Nice! 1 done today.')).toBeVisible();
    await expect(page.getByTestId('today-badge')).toHaveText('1');
    await page.getByRole('button', { name: `Undo: ${second}` }).click();
    await expect(rows.nth(0)).toContainText(second);
    await expect(page.getByText(/done today/)).toHaveCount(0);

    // The daily focus time is the user's own, and it sticks.
    const capacity = page.getByRole('combobox', { name: 'Daily focus time' });
    await capacity.selectOption({ label: '4h' });
    await expect(page.getByTestId('focus-planned')).toContainText('/ 4h');
    await page.reload();
    await expect(page.getByTestId('focus-planned')).toContainText('/ 4h');
    await capacity.selectOption({ label: '6h' });

    // Clean up: take both off the plan.
    for (const title of [first, second]) await page.getByRole('button', { name: `Remove from today: ${title}` }).click();
    await expect(page.getByText('Nothing planned yet. Pick something from the suggestions below.')).toBeVisible();
});
