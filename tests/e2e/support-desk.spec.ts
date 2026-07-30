import { test, expect } from '@playwright/test';

test('agent desk: gated, lists tickets, reads a conversation', async ({ page }) => {
    await page.goto('/support');
    // Agent (smoke owner) reaches the desk
    await expect(page.getByText('Agent workspace')).toBeVisible();
    await expect(page.getByText('Escalated issue shows blank customer profile')).toBeVisible();
    // Open the ticket → conversation renders the seeded messages
    await page.getByText('Escalated issue shows blank customer profile').first().click();
    await expect(page).toHaveURL(/\/support\/tickets\//);
    await expect(page.getByText('reproduced, escalating to engineering', { exact: false })).toBeVisible();
    // Context: requester + org
    await expect(page.getByText('Grace Okonkwo').first()).toBeVisible();
    await expect(page.getByText('Northwind Traders').first()).toBeVisible();
});

test('agent desk: post a public reply, add an internal note, change status', async ({ page }) => {
    await page.goto('/support');
    await page.getByText('Escalated issue shows blank customer profile').first().click();
    await expect(page).toHaveURL(/\/support\/tickets\//);

    // Public reply → appears in the thread.
    const reply = `E2E public reply ${Date.now()}`;
    await page.getByRole('textbox').fill(reply);
    await page.getByRole('button', { name: /Submit as/ }).click();
    await expect(page.getByText(reply)).toBeVisible();

    // Internal note → appears as a note.
    const note = `E2E internal note ${Date.now()}`;
    await page.getByRole('button', { name: 'Internal note' }).click();
    await page.getByRole('textbox').fill(note);
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText(note)).toBeVisible();

    // Change status via the header dropdown → trigger label updates.
    await page.getByRole('button', { name: /^Status:/ }).click();
    await page.getByRole('menuitem', { name: 'On hold' }).click();
    await expect(page.getByRole('button', { name: 'Status: On hold' })).toBeVisible();
});

test('agent desk: create a new ticket from the rail', async ({ page }) => {
    await page.goto('/support');
    await page.getByRole('button', { name: 'New ticket' }).click();

    const subject = `E2E new ticket ${Date.now()}`;
    await page.getByLabel('Subject').fill(subject);
    await page.getByRole('button', { name: 'Requester' }).click();
    await page.getByRole('menuitem', { name: /Grace Okonkwo/ }).click();
    await page.getByLabel('Description').fill('Customer cannot access their dashboard.');
    await page.getByRole('button', { name: 'Create ticket' }).click();

    await expect(page).toHaveURL(/\/support\/tickets\//);
    await expect(page.getByText(subject)).toBeVisible();
    await expect(page.getByText('Customer cannot access their dashboard.')).toBeVisible();
});

test('agent desk: file a ticket for a newly-created contact', async ({ page }) => {
    await page.goto('/support');
    await page.getByRole('button', { name: 'New ticket' }).click();

    const subject = `E2E new-contact ticket ${Date.now()}`;
    await page.getByLabel('Subject').fill(subject);

    // Inline contact creation instead of picking an existing requester.
    await page.getByRole('button', { name: '+ New contact' }).click();
    const contactName = `E2E Contact ${Date.now()}`;
    const contactEmail = `e2e-${Date.now()}@x.com`;
    await page.getByLabel('Contact name').fill(contactName);
    await page.getByLabel('Contact email').fill(contactEmail);
    await page.getByRole('button', { name: 'Create contact' }).click();

    // The inline form closes and the new contact becomes the selected requester.
    await expect(page.getByRole('button', { name: 'Requester' })).toContainText(contactName);

    await page.getByLabel('Description').fill('Customer reports a billing discrepancy on their invoice.');
    await page.getByRole('button', { name: 'Create ticket' }).click();

    await expect(page).toHaveURL(/\/support\/tickets\//);
    await expect(page.getByText(subject)).toBeVisible();
    await expect(page.getByText('Customer reports a billing discrepancy on their invoice.')).toBeVisible();
});

test('agent desk: the SLA card shows a first-reply countdown on a due ticket', async ({ page }) => {
    await page.goto('/support');
    await page.getByText('Cannot invite new agents — seat limit error').first().click();
    await expect(page).toHaveURL(/\/support\/tickets\//);
    // Context panel SLA card for the (unreplied, policy-bearing) due ticket.
    await expect(page.getByText(/First reply due|SLA breached/)).toBeVisible();
    await expect(page.getByText('First reply target · Standard SLA')).toBeVisible();
});

test('agent desk: filter by channel then by tag', async ({ page }) => {
    await page.goto('/support');
    // Default view is "mine" (both seeded tickets are assigned to the smoke owner + unsolved).
    await expect(page.locator('[data-testid="ticket-row"]', { hasText: 'Escalated issue shows blank customer profile' })).toBeVisible();

    // Pick the Chat channel → the email escalation ticket drops out, the chat "seat limit" ticket remains.
    await page.getByRole('button', { name: /Chat/ }).click();
    await expect(page.locator('[data-testid="ticket-row"]', { hasText: 'Escalated issue shows blank customer profile' })).toHaveCount(0);
    await expect(page.locator('[data-testid="ticket-row"]', { hasText: 'Cannot invite new agents — seat limit error' })).toBeVisible();

    // Open the chat ticket and click its billing tag chip → list stays filtered to the tagged ticket + a clear chip appears.
    await page.locator('[data-testid="ticket-row"]', { hasText: 'Cannot invite new agents — seat limit error' }).click();
    await page.getByRole('button', { name: 'billing' }).click();
    await expect(page.getByRole('button', { name: /Tag: billing/ })).toBeVisible();
    await expect(page.locator('[data-testid="ticket-row"]', { hasText: 'Cannot invite new agents — seat limit error' })).toBeVisible();
});

test('agent desk: load more tickets then sort the queue', async ({ page }) => {
    await page.goto('/support');
    // Default "mine" view renders the ticket rows.
    await expect(page.locator('[data-testid="ticket-row"]').first()).toBeVisible();

    // "All unsolved" pulls in the seed's ~34 unsolved tickets — more than the 25-per-page
    // default — so a "Load more" button should appear.
    await page.getByRole('button', { name: /All unsolved/ }).click();
    const loadMore = page.getByRole('button', { name: /load more/i });
    await expect(loadMore).toBeVisible();

    const before = await page.locator('[data-testid="ticket-row"]').count();
    await loadMore.click();
    await expect.poll(() => page.locator('[data-testid="ticket-row"]').count()).toBeGreaterThan(before);

    // Sort by priority — the list still renders tickets; exact order is data-dependent and
    // deliberately not asserted.
    await page.getByRole('button', { name: 'Sort tickets' }).click();
    await page.getByRole('menuitem', { name: 'Priority' }).click();
    await expect(page.locator('[data-testid="ticket-row"]').first()).toBeVisible();
    expect(await page.locator('[data-testid="ticket-row"]').count()).toBeGreaterThan(0);
});

test('saves, applies, and deletes a custom view', async ({ page }) => {
    await page.goto('/support');
    await expect(page.locator('[data-testid="ticket-row"]').first()).toBeVisible();

    // Apply a built-in view + a non-default sort, then save it.
    await page.getByRole('button', { name: 'All unsolved' }).click();
    await page.getByRole('button', { name: 'Sort tickets' }).click();
    await page.getByRole('menuitem', { name: 'Priority' }).click();

    await page.getByRole('button', { name: /\+ Save view/ }).click();
    await page.getByPlaceholder('View name').fill('My urgent queue');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // It appears in the Saved views group and is applied. (The delete "✕" button's
    // accessible name — "Delete view My urgent queue" — also contains this substring, so
    // disambiguate via the row's rendered text, which the delete button lacks.)
    const savedRow = page.getByRole('button', { name: 'My urgent queue' }).filter({ hasText: 'My urgent queue' });
    await expect(savedRow).toBeVisible();
    await expect(page.locator('[data-testid="ticket-row"]').first()).toBeVisible();

    // Switch to a built-in, then re-select the saved view — the list still renders.
    await page.getByRole('button', { name: 'Your unsolved tickets' }).click();
    await savedRow.click();
    await expect(page.locator('[data-testid="ticket-row"]').first()).toBeVisible();

    // Delete it — it disappears.
    await page.getByRole('button', { name: 'Delete view My urgent queue' }).click();
    await expect(page.getByRole('button', { name: 'My urgent queue' })).toHaveCount(0);
});
