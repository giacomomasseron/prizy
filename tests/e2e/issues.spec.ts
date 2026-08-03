import { expect, test } from '@playwright/test';

test('peek drawer: open from list → follow "Open full issue →" to /issues/:id', async ({ page }) => {
    test.setTimeout(60_000);
    // Pre-authenticated via storageState
    await page.goto('/');
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
    // Pre-authenticated via storageState
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const title = `E2E Drawer ${Date.now()}`;

    // Open create drawer via C hotkey — Issue title input (autoFocus) becomes visible
    await page.keyboard.press('c');
    await expect(page.getByLabel(/Issue title/i)).toBeVisible({ timeout: 6_000 });

    // Robust team selection: if entities.spec (which runs first alphabetically)
    // added a 2nd team, the team picker button appears — pick 'Smoke Team' explicitly.
    // In a single-team workspace the button is absent and auto-select fires instead.
    try {
        const teamPicker = page.getByRole('button', { name: /Issue team/i });
        await teamPicker.waitFor({ state: 'visible', timeout: 3_000 });
        await teamPicker.click();
        await page.getByRole('menuitem', { name: 'Smoke Team' }).click();
    } catch {
        // Single-team workspace: auto-selection already fired — no action needed.
    }

    // Fill title and wait for Create button to be enabled (team + title required)
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
    // Pre-authenticated via storageState
    await page.goto('/');
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
    // Pre-authenticated via storageState
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

// ── New: Issue detail page interactions ──
// Runs last (after board drag) so that changing an issue's status to "Done"
// does not interfere with the board-drag test that expects "Starter issue" in col-todo.
test('issue detail: change status via dropdown, set assignee, add comment', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to detail via peek → "Open full issue →"
    const firstRow = page.locator('[data-testid="issue-row"]').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    await firstRow.click();

    const openLink = page.getByRole('link', { name: /Open full issue/i });
    await expect(openLink).toBeVisible({ timeout: 8_000 });
    await openLink.click();
    await expect(page).toHaveURL(/\/issues\/[^?]+$/);

    // ── Change Status via Menu ──
    const changeStatusBtn = page.getByRole('button', { name: 'Change status' });
    await expect(changeStatusBtn).toBeVisible({ timeout: 8_000 });

    // Set up response waiter BEFORE the click to avoid race condition.
    const statusPut = page.waitForResponse(
        (r) => r.url().includes('/status') && r.request().method() === 'PUT',
        { timeout: 15_000 },
    );

    await changeStatusBtn.click();
    await page.waitForSelector('[role="menu"]', { timeout: 5_000 });

    // Use dispatchEvent('click') rather than .click() to bypass Playwright's full
    // pointer-event dispatch sequence (pointerdown → pointerup → click).  The Menu
    // component's document-level pointerdown listener treats certain synthetic pointer
    // events as "outside clicks" and closes the menu before the click fires, swallowing
    // the handler.  dispatchEvent fires only the click event, which bubbles through the
    // React root as expected.
    await page.getByRole('menuitem', { name: 'Done' }).dispatchEvent('click');

    const statusRes = await statusPut;
    expect(statusRes.status()).toBe(200);

    // Optimistic update fires immediately; server response confirms it.
    await expect(changeStatusBtn).toContainText('Done', { timeout: 6_000 });

    // ── Set Assignee via Menu ──
    const assigneeBtn = page.getByRole('button', { name: 'Edit assignee' });
    await expect(assigneeBtn).toBeVisible({ timeout: 6_000 });

    const assigneePut = page.waitForResponse(
        (r) => r.url().includes('/assignee') && r.request().method() === 'PUT',
        { timeout: 15_000 },
    );

    await assigneeBtn.click();
    await page.waitForSelector('[role="menu"]', { timeout: 5_000 });
    // "Smoke Dev" is the sole workspace member in the smoke seed
    await page.getByRole('menuitem', { name: 'Smoke Dev' }).dispatchEvent('click');

    await assigneePut;
    await expect(assigneeBtn).toContainText('Smoke Dev', { timeout: 8_000 });

    // ── Add a comment ──
    const commentBox = page.getByLabel(/Leave a comment/i);
    await expect(commentBox).toBeVisible({ timeout: 6_000 });
    const commentText = `E2E comment ${Date.now()}`;
    await commentBox.fill(commentText);
    const commentPost = page.waitForResponse(
        (r) => r.url().includes('/comments') && r.request().method() === 'POST',
        { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /^Comment$/i }).click();
    const commentRes = await commentPost;
    expect(commentRes.status()).toBe(201);
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 8_000 });

    // ── Comment renders in the redesigned "Comments {count}" section with an author card ──
    await expect(page.getByText(/Comments/)).toBeVisible();

    // ── Add a reaction: open the palette on the first comment, pick 🎯, see the pill ──
    await page.getByRole('button', { name: 'Add reaction' }).first().click();
    const reactionAdd = page.waitForResponse(
        (r) => r.url().includes('/reactions') && r.request().method() === 'POST',
        { timeout: 15_000 },
    );
    // Exact match: the palette button's accessible name is exactly "🎯", whereas the
    // resulting reaction pill's accessible name is "🎯 1" — a plain substring match
    // would match both, so pin this one down with exact:true.
    await page.getByRole('button', { name: '🎯', exact: true }).click();
    await reactionAdd;
    await expect(page.getByRole('button', { name: /🎯 1/ })).toBeVisible({ timeout: 8_000 });

    // ── Toggle it off (self-cleaning) ──
    const reactionRemove = page.waitForResponse(
        (r) => r.url().includes('/reactions') && r.request().method() === 'POST',
        { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /🎯 1/ }).click();
    await reactionRemove;
    await expect(page.getByRole('button', { name: /🎯 1/ })).toHaveCount(0);
});
