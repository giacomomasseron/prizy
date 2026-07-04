import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');
}

test('peek drawer: open from list → follow "Open full issue →" to /issues/:id', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await page.waitForLoadState('networkidle');

    // Wait for at least one issue row to be visible
    const firstRow = page.locator('[data-testid="issue-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });

    // Click the row to open peek
    await firstRow.click();

    // Peek drawer appears: "Open full issue →" link
    const openLink = page.getByRole('link', { name: /Open full issue/i });
    await expect(openLink).toBeVisible({ timeout: 8_000 });

    // URL contains ?peek=
    await expect(page).toHaveURL(/peek=/);

    // Follow the link
    await openLink.click();

    // Navigated to /issues/:id (no peek param)
    await expect(page).toHaveURL(/\/issues\/[^?]+$/);
});

test('create issue via drawer: appears in the list', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await page.waitForLoadState('networkidle');

    const title = `E2E Drawer ${Date.now()}`;

    // Open create drawer via C hotkey — Issue title input (autoFocus) becomes visible
    await page.keyboard.press('c');
    await expect(page.getByLabel(/Issue title/i)).toBeVisible({ timeout: 6_000 });

    // Fill title (team auto-selected for single-team workspace)
    await page.getByLabel(/Issue title/i).fill(title);

    // Wait for team auto-selection (single-team useEffect) so button is enabled
    await expect(page.getByRole('button', { name: /Create issue/i })).not.toBeDisabled({ timeout: 5_000 });

    // Submit
    const createResponsePromise = page.waitForResponse(
        (r) => r.url().includes('/issues') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /Create issue/i }).click();
    const res = await createResponsePromise;
    expect(res.status()).toBe(201);

    // Drawer closes: title input no longer visible, and issue appears in list
    await expect(page.getByLabel(/Issue title/i)).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 8_000 });
});

test('list ↔ board toggle via SegmentedControl', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // Switch to Board
    await page.getByRole('button', { name: 'Board' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/board');
    // At least one board column is visible
    await expect(page.locator('[data-testid="col-todo"]')).toBeVisible({ timeout: 8_000 });

    // Switch back to List
    await page.getByRole('button', { name: 'List' }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');
    // Issue rows visible
    await expect(page.locator('[data-testid="issue-row"]').first()).toBeVisible({ timeout: 8_000 });
});

test('board drag: moves the card and does NOT open peek drawer', async ({ page }) => {
    test.setTimeout(60_000);
    await login(page);
    await page.goto('/board');
    await page.waitForLoadState('networkidle');

    // Wait for col-todo to have at least one card (the seeded "Starter issue")
    const sourceCol = page.getByTestId('col-todo');
    await expect(sourceCol).toBeVisible({ timeout: 10_000 });
    const card = sourceCol.locator('[data-testid^="card-"]').filter({ hasText: 'Starter issue' });
    await expect(card).toBeVisible({ timeout: 10_000 });

    const target = page.getByTestId('col-in_progress');
    const from = await card.boundingBox();
    const to = await target.boundingBox();

    // Drag using the same PointerSensor-safe technique as the smoke test.
    // Start at the top edge of the card (above any inner link text).
    const startX = from!.x + from!.width / 2;
    const startY = from!.y + 3;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Wait for dnd-kit's PointerSensor to register the pointer event
    await page.waitForTimeout(100);
    // Cross the activation threshold
    await page.mouse.move(startX + 1, startY + 8, { steps: 5 });
    await page.waitForTimeout(50);
    // Drag to the center of col-in_progress
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 20 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Give React time to process the drop event and API call
    await page.waitForTimeout(500);

    // Guard: the peek drawer must NOT have opened after the drag.
    // The URL must have no ?peek= and the "Open full issue" link must be absent.
    expect(page.url()).not.toContain('peek=');
    await expect(page.getByRole('link', { name: /Open full issue/i })).not.toBeVisible();

    // Status transition happened: the card is now visible in col-in_progress.
    await expect(
        page.getByTestId('col-in_progress').locator('[data-testid^="card-"]').filter({ hasText: 'Starter issue' }),
    ).toBeVisible();
});
