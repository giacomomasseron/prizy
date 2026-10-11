import { expect, test } from '@playwright/test';

// P7-C: a project's chat (pre-authenticated as the smoke owner via storageState).
test('posts a message that survives a reload, edits it, and deletes it', async ({ page }) => {
    const text = `E2E chat ${Date.now()}`;
    await page.goto('/projects');
    await page.locator('[data-testid^="project-row-"]').filter({ hasText: 'Smoke Roadmap Project' }).click();
    await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: /^Chat/ }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/chat$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Chat' })).toBeVisible();

    const box = page.getByRole('combobox', { name: 'Message the Smoke Roadmap Project team' });
    await box.fill(text);
    await box.press('Enter');
    const messages = page.getByRole('list', { name: 'Messages' });
    await expect(messages.getByText(text)).toBeVisible();
    await expect(box).toHaveValue('');

    // The chat lives on the server, not in the browser.
    await page.reload();
    const row = messages.getByRole('listitem').filter({ hasText: text });
    await expect(row).toBeVisible();

    await row.hover();
    await row.getByRole('button', { name: 'Edit' }).click();
    const field = row.getByRole('combobox', { name: 'Edit message' });
    await field.fill(`${text}, edited`);
    await field.press('Enter');
    await expect(row.getByText(`${text}, edited`)).toBeVisible();
    await expect(row.getByText('(edited)')).toBeVisible();

    await row.hover();
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByTestId('confirm-dialog-confirm').click();
    await expect(messages.getByText(text)).toHaveCount(0);
});

test('@ in the chat offers people above the field, and Enter inserts one', async ({ page }) => {
    await page.goto('/projects');
    await page.locator('[data-testid^="project-row-"]').filter({ hasText: 'Smoke Roadmap Project' }).click();
    await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: /^Chat/ }).click();

    const box = page.getByRole('combobox', { name: 'Message the Smoke Roadmap Project team' });
    await box.fill('Ask @');
    const people = page.getByRole('listbox', { name: 'Mentions' }).getByRole('group', { name: 'People' });
    await expect(people.getByRole('option').first()).toBeVisible();
    const popover = await page.getByRole('listbox', { name: 'Mentions' }).boundingBox();
    const field = await box.boundingBox();
    expect(popover!.y + popover!.height).toBeLessThanOrEqual(field!.y);

    await box.press('Enter');
    await expect(box).toHaveValue(/^Ask @\S.* $/);
    await expect(page.getByRole('listbox', { name: 'Mentions' })).toHaveCount(0);
});
