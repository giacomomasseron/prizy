import { test, expect } from '@playwright/test';

test('agent reaches reporting from the desk rail and sees the overview', async ({ page }) => {
    await page.goto('/support');
    await page.getByRole('link', { name: 'Reporting' }).click();
    await expect(page).toHaveURL(/\/support\/reporting$/);

    // KPI cards + overview charts render from the seeded historical tickets.
    await expect(page.getByText('Tickets created')).toBeVisible();
    await expect(page.getByText('Median first reply')).toBeVisible();
    await expect(page.getByText('Ticket volume')).toBeVisible();
    await expect(page.getByText('Tickets by status')).toBeVisible();
    await expect(page.getByText('Escalations to engineering')).toBeVisible();

    // Range toggle still works.
    await page.getByRole('button', { name: '30d' }).click();
    await expect(page.getByText('Ticket volume')).toBeVisible();
});

test('agent opens the Agents & CSAT section and sees the agent report', async ({ page }) => {
    await page.goto('/support/reporting');
    await page.getByRole('button', { name: 'Agents & CSAT' }).click();

    // Widen to 90d so the seeded ratings/replies (spread across the quarter) are in-window.
    await page.getByRole('button', { name: '90d' }).click();

    // The agent report renders from the seeded agents / ratings / messages.
    await expect(page.getByText('Agent performance')).toBeVisible();
    await expect(page.getByText('Replies per day')).toBeVisible();
    await expect(page.getByText('Satisfaction')).toBeVisible();
});

test('agent opens the SLA & channels section and sees the SLA report', async ({ page }) => {
    await page.goto('/support/reporting');
    await page.getByRole('button', { name: 'SLA & channels' }).click();

    // Widen to 90d so the seeded policied history (spread across the quarter) is in-window.
    await page.getByRole('button', { name: '90d' }).click();

    // The SLA report renders from the seeded policies / tickets / tags.
    await expect(page.getByText('SLA attainment')).toBeVisible();
    await expect(page.getByText('By channel')).toBeVisible();
    await expect(page.getByText('Breach risk')).toBeVisible();
});

test('renders sparklines on the Overview KPI cards', async ({ page }) => {
    await page.goto('/support/reporting');
    // Overview is the default section; KPI cards render sparkline SVGs once the report loads.
    await expect(page.locator('svg polyline').first()).toBeVisible();
});

test('exposes an Export CSV button on each reporting section', async ({ page }) => {
    await page.goto('/support/reporting');
    const exportBtn = page.getByRole('button', { name: 'Export CSV' });
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled(); // overview data loads by default

    await page.getByRole('button', { name: 'Agents & CSAT' }).click();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();

    await page.getByRole('button', { name: 'SLA & channels' }).click();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
});

test('saves, applies, and deletes a report', async ({ page }) => {
    await page.goto('/support/reporting');

    // Pick a non-default section + range, then save it.
    await page.getByRole('button', { name: 'SLA & channels' }).click();
    await page.getByRole('button', { name: '90d' }).click();
    await page.getByRole('button', { name: /\+ Save report/ }).click();
    await page.getByPlaceholder('Report name').fill('My SLA view');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    const savedRow = page.getByRole('button', { name: 'My SLA view' }).filter({ hasText: 'My SLA view' });
    await expect(savedRow).toBeVisible();

    // Switch away, then re-select the saved report — the SLA section renders again.
    // Note: a bare "Overview" name substring-matches the seeded "Weekly overview" saved-report
    // row (and its delete button) — the section switcher's icon+label disambiguates.
    await page.getByRole('button', { name: '◫ Overview' }).click();
    await savedRow.click();
    await expect(page.getByText('SLA attainment')).toBeVisible();

    // Delete it — it disappears.
    await page.getByRole('button', { name: 'Delete report My SLA view' }).click();
    await expect(page.getByRole('button', { name: 'My SLA view' })).toHaveCount(0);
});
