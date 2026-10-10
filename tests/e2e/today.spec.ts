import { expect, test } from '@playwright/test';

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
