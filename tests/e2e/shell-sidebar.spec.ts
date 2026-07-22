import { test, expect } from '@playwright/test';

test.describe('shell sidebar redesign', () => {
    test('sections, collapse persistence, and team-scoped nav', async ({ page }) => {
        await page.goto('/');

        // Redesigned sections present.
        // Note: getByRole name-matching is a case-insensitive SUBSTRING match by
        // default, and the footer's user-menu trigger reads "…Prizy workspace" —
        // an un-exact 'Workspace' match hits both, so pin this one to exact:true.
        await expect(page.getByText('Support bridge')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Workspace', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'My Teams' })).toBeVisible();

        // My Issues → issue list filtered to the current user.
        // The link's href starts as '/' and only picks up '?assignee_id=' once
        // useMe() resolves, so wait for the href to update before clicking to
        // avoid racing the click against that async resolution.
        const myIssuesLink = page.getByRole('link', { name: /My Issues/ });
        await expect(myIssuesLink).toHaveAttribute('href', /assignee_id=/, { timeout: 10_000 });
        await myIssuesLink.click();
        await expect(page).toHaveURL(/assignee_id=/);

        // Expand the seeded team → team-scoped Cycles.
        // The team row's decorative icon glyphs are aria-hidden, so its
        // accessible name is exactly the team name (plus a trailing member
        // count when present) — a regex keeps this robust either way.
        await page.getByRole('button', { name: /Smoke Team/ }).click();
        // The team-tree child links' leading icon glyphs (▤/◔/▦) are now
        // aria-hidden, so the accessible name is exactly the label — use an
        // exact match to prove the clean name and disambiguate from any
        // other "Cycles"-named element on the page.
        await page.getByRole('link', { name: 'Cycles', exact: true }).click();
        await expect(page).toHaveURL(/\/teams\/[0-9a-f-]+\/cycles/);
        await expect(page.getByRole('heading', { name: 'Cycles' })).toBeVisible();

        // Collapse the sidebar → persists across reload
        await page.getByRole('button', { name: 'Collapse sidebar' }).click();
        await expect(page.getByText('Support bridge')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
        await page.reload();
        await expect(page.getByText('Support bridge')).toHaveCount(0);

        // Re-open
        await page.getByRole('button', { name: 'Expand sidebar' }).click();
        await expect(page.getByText('Support bridge')).toBeVisible();
    });
});
