import { expect, test } from '@playwright/test';

test.describe('Knowledge base authoring (agent) → public help center', () => {
    test('creates a category, section and article, publishes it, and the public site serves it', async ({ page, context }) => {
        test.setTimeout(90_000);
        const stamp = Date.now().toString(36);
        await page.goto('/support/kb');
        await expect(page.getByRole('heading', { name: 'All articles' })).toBeVisible();

        // Category
        await page.getByRole('button', { name: '＋ Category' }).click();
        await page.getByPlaceholder('e.g. Accounts & SSO').fill(`E2E topic ${stamp}`);
        await expect(page.getByPlaceholder('slug')).toHaveValue(`e2e-topic-${stamp}`);
        await page.getByRole('button', { name: '☂' }).click();
        await page.getByRole('button', { name: '#5b8def' }).click();
        // exact: true — the seeded article "Create your first project" (All articles is still
        // the active scope behind this modal) gives its row-open button an aria-label of "Open
        // Create your first project", which substring-matches a bare "Create" locator; the Modal
        // component doesn't aria-hide the page behind it, so both are in the accessibility tree
        // at once. Confirmed via Playwright's own strict-mode error before adding `exact`.
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(page.getByRole('button', { name: new RegExp(`E2E topic ${stamp}`) })).toBeVisible();

        // Section (the new category is auto-selected → its "＋ Section" row). A freshly
        // created category always gets position = max(existing)+1, so it sorts AFTER every
        // seeded category (all seeded at position 0) — its "＋ Section" button is therefore
        // always the LAST one in the tree, never the first. Verified against the seeded
        // categories (Billing & plans, Getting started, Tickets & escalations, all position
        // 0) before writing this: `.first()` would hit Billing & Plans instead.
        await page.getByRole('button', { name: '＋ Section' }).last().click();
        await page.getByPlaceholder('e.g. Troubleshooting').fill('Guides');
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await expect(page.getByRole('button', { name: /Guides/ })).toBeVisible();

        // Article
        await page.getByRole('button', { name: '＋ New article here' }).click();
        await expect(page).toHaveURL(/\/support\/kb\/new/);
        await page.getByPlaceholder('Article title').fill(`E2E article ${stamp}`);
        await page.getByPlaceholder('# Heading').fill('## Hello\n\nThis was written by an end-to-end test.');
        await page.getByRole('button', { name: 'Save changes' }).click();
        await expect(page).toHaveURL(/\/support\/kb\/articles\//);
        // Fix round 1: KbArticleEditorPage now hands the just-created id up to the outer
        // component (which survives the /new → /articles/:id navigation) so the freshly
        // remounted EditorForm seeds "Saved just now" instead of losing it to the remount.
        await expect(page.getByText('Saved just now')).toBeVisible();
        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByText('Live on the help center and returned by customer search.')).toBeVisible();

        // Public side
        const pub = await context.newPage();
        await pub.goto(`/help/e2e-topic-${stamp}/guides/e2e-article-${stamp}`);
        await expect(pub.getByRole('heading', { name: `E2E article ${stamp}` })).toBeVisible();
        await expect(pub.getByText('This was written by an end-to-end test.')).toBeVisible();

        // Archive → public URL redirects to the topic
        await page.getByRole('button', { name: 'Archive' }).click();
        await expect(page.getByText('Hidden from customers and from search. Its URL redirects to the category.')).toBeVisible();
        await pub.goto(`/help/e2e-topic-${stamp}/guides/e2e-article-${stamp}`);
        await expect(pub).toHaveURL(new RegExp(`/help/e2e-topic-${stamp}$`));
    });

    test('non-agent member is redirected away from /support/kb', async ({ browser }) => {
        // member@ is seeded without is_agent (see SmokeSeeder); log in fresh.
        const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await ctx.newPage();
        await page.goto('/login');
        await page.getByLabel(/email/i).fill('member@example.com');
        await page.getByLabel(/password/i).fill('password123');
        await page.getByRole('button', { name: /sign in/i }).click();
        // Prove the member is actually authenticated FIRST. Without this, the redirect
        // below could come from any other guard (an unverified email, say) and the test
        // would pass green without RequireAgent ever firing.
        await expect(page).not.toHaveURL(/\/login/);
        await page.goto('/support/kb');
        await expect(page).not.toHaveURL(/\/support\/kb/);
        // Positive evidence that the agent gate is what bounced them: the sidebar's
        // agent-gated Knowledge base row is absent for this user.
        await expect(page.getByRole('link', { name: /Knowledge base/ })).toHaveCount(0);
        await ctx.close();
    });
});
