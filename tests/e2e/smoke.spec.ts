import { expect, test } from '@playwright/test';

test('login, create an issue, and move its card across the board', async ({ page }) => {
    // 1. Log in (session + CSRF, end-to-end).
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL('http://smoke.localhost:8001/');

    // 2. Create an issue via the UI (team_id comes from the seeded starter issue).
    const title = `Smoke ${Date.now()}`;
    await page.getByLabel(/new issue title/i).fill(title);
    await page.getByRole('button', { name: /add issue/i }).click();
    await expect(page.getByText(title)).toBeVisible();

    // 3. On the board, drag the new card (created in 'backlog') into 'in_progress'.
    //    @dnd-kit's PointerSensor needs a real mouse-move drag, not HTML5 dragTo.
    await page.goto('/board');

    // Get the card DIV (not the inner Link) to avoid click-through navigation.
    const card = page.getByTestId('col-backlog').locator('[data-testid^="card-"]').filter({ hasText: title });
    const target = page.getByTestId('col-in_progress');
    const from = await card.boundingBox();
    const to = await target.boundingBox();

    // Start at the top edge of the card (padding area, not on the Link text)
    // so that pointerdown lands on the card div rather than the inner <a>.
    const startX = from!.x + from!.width / 2;
    const startY = from!.y + 3;  // 3px from top, inside padding, above the link text

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Wait for dnd-kit's PointerSensor to register the press event
    await page.waitForTimeout(100);
    // Move a few pixels first to cross PointerSensor's activation threshold
    await page.mouse.move(startX + 1, startY + 8, { steps: 5 });
    await page.waitForTimeout(50);
    // Drag to the center of col-in_progress
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 20 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Give React time to process the drop event and API call
    await page.waitForTimeout(500);

    // 4. The card is now in 'in_progress' and persists after a reload.
    await expect(page.getByTestId('col-in_progress').getByText(title)).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('col-in_progress').getByText(title)).toBeVisible();
});
