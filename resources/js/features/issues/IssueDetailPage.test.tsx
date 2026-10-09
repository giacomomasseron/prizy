import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IssueDetailPage from './IssueDetailPage';
// Namespace imports required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';
import * as authModule from '../../auth/useAuth';

// Minimal mocks — vi.fn() on hooks that need per-test override
vi.mock('./hooks', () => ({
    // vi.fn() so per-test overrides via vi.mocked(...).mockReturnValue() work (e.g. support_ticket)
    useIssue: vi.fn().mockReturnValue({
        isLoading: false,
        isError: false,
        data: {
            id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
            description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
            assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
            support_ticket: null,
            created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
        },
    }),
    useComments: vi.fn().mockReturnValue({ data: { items: [] } }),
    useActivities: vi.fn().mockReturnValue({ data: { items: [] } }),
    // vi.fn() so per-test overrides via vi.mocked(...).mockReturnValue() work (composer tests)
    useAddComment: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
    useToggleReaction: () => ({ mutate: vi.fn() }),
    useIssueLabels: () => ({ data: { items: [] } }),
    useSetIssueLabels: () => ({ mutateAsync: vi.fn() }),
    // vi.fn() so per-test overrides via vi.mocked(...).mockReturnValue() work
    useUpdateIssue: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
    useTransitionStatus: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
    useAssignIssue: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
    STATUSES: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'],
}));
vi.mock('./githubLinks', () => ({
    useGithubLinks: () => ({ data: [] }),
    useAddGithubLink: () => ({ mutateAsync: vi.fn() }),
    useRemoveGithubLink: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../features/members/hooks', () => ({
    useMembers: () => ({ data: [{ id: 'm1', name: 'Alice', is_agent: false }] }),
}));
vi.mock('../../auth/useAuth', () => ({
    // vi.fn() so per-test viewer override works via vi.mocked(authModule.useMe).mockReturnValue(...)
    useMe: vi.fn().mockReturnValue({ data: { id: 'me', is_developer: true, admin_level: 'admin' } }),
}));
vi.mock('../labels/hooks', () => ({ useLabels: () => ({ data: { items: [] } }) }));
vi.mock('../projects/hooks', () => ({ useProjects: () => ({ data: { items: [] } }) }));
vi.mock('../teams/hooks', () => ({ useCycles: () => ({ data: { items: [] } }) }));
vi.mock('../releases/hooks', () => ({ useReleases: () => ({ data: [] }) }));

function wrapper(ui: React.ReactNode) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/issues/abc123']}>
                <Routes>
                    <Route path="/issues/:id" element={ui} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
}

// ── Base tests from brief ────────────────────────────────────────────────────

describe('IssueDetailPage', () => {
    it('shows identifier and title', () => {
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.getByText('PRZ-1')).toBeInTheDocument();
        expect(screen.getByText('Test Issue')).toBeInTheDocument();
    });

    it('shows properties panel with Status/Priority/Assignee rows', () => {
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Assignee')).toBeInTheDocument();
    });

    it('hides support block when no ticket', () => {
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.queryByText(/Escalated from Support/i)).not.toBeInTheDocument();
    });

    it('shows comment input', () => {
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        expect(screen.getByLabelText(/Leave a comment/i)).toBeInTheDocument();
    });

    it('renders a comment card with author name, body, and a reaction pill', () => {
        vi.mocked(hooks.useComments).mockReturnValue({
            data: {
                items: [{
                    id: 'c1',
                    issue_id: 'abc123',
                    user_id: 'm1',
                    body: 'This looks great, thanks!',
                    is_internal: false,
                    edited_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    reactions: [{ emoji: '👀', count: 2, reacted: false }],
                }],
            },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('This looks great, thanks!')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /👀 2/ })).toBeInTheDocument();

        // Reset so later tests (e.g. the activity-feed one, which also asserts on
        // a lone "Alice" text node) don't see this test's leaked comment mock.
        vi.mocked(hooks.useComments).mockReturnValue({ data: { items: [] } } as any);
    });

    it('activity feed: shows member name (not raw type) when user_id matches a member', () => {
        vi.mocked(hooks.useActivities).mockReturnValue({
            data: {
                items: [{
                    id: 'act1',
                    issue_id: 'abc123',
                    user_id: 'm1',
                    type: 'status_changed',
                    from_value: 'todo',
                    to_value: 'in_progress',
                    created_at: '2026-07-04T00:00:00Z',
                }],
            },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        // Member name should be visible
        expect(screen.getByText('Alice')).toBeInTheDocument();
        // Raw type string must NOT appear as the actor label
        expect(screen.queryByText('status_changed')).not.toBeInTheDocument();
    });

    it('activity feed: "created" shows "created this issue" without a " → title" suffix', () => {
        vi.mocked(hooks.useActivities).mockReturnValue({
            data: {
                items: [{
                    id: 'act2',
                    issue_id: 'abc123',
                    user_id: 'm1',
                    type: 'created',
                    from_value: null,
                    to_value: 'Test Issue',
                    created_at: '2026-07-04T00:00:00Z',
                }],
            },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        expect(screen.getByText(/created this issue/)).toBeInTheDocument();
        expect(screen.queryByText(/created this issue.*→/)).not.toBeInTheDocument();

        // Reset so later tests don't see this leaked activity mock.
        vi.mocked(hooks.useActivities).mockReturnValue({ data: { items: [] } } as any);
    });

    it('escalation banner: shows ref/subject/customer/plan + an "Open original ticket" link when support_ticket is set', () => {
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false,
            isError: false,
            data: {
                id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
                description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
                assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
                support_ticket: { id: 'tk1', ref: 'TKT-9', subject: 'Login is broken', customer: 'Acme Corp', plan: 'Pro' },
                created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
            },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        // Scope to the banner container — the synthetic activity row below also
        // renders a "TKT-9" ref span, so an unscoped query would be ambiguous.
        const bannerHeader = screen.getByText(/Escalated from Support/);
        const banner = bannerHeader.parentElement as HTMLElement;
        expect(within(banner).getByText('TKT-9')).toBeInTheDocument();
        expect(within(banner).getByText('Login is broken')).toBeInTheDocument();
        expect(within(banner).getByText(/Acme Corp/)).toBeInTheDocument();
        expect(within(banner).getByRole('link', { name: /Open original ticket/ })).toHaveAttribute('href', '/support/tickets/tk1');

        // Reset so later tests see the default (no ticket) issue.
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false,
            isError: false,
            data: {
                id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
                description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
                assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
                support_ticket: null,
                created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
            },
        } as any);
    });

    it('G3a: the escalated pill writes accent text in the ink partner on its accent tint', () => {
        const issue = {
            id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
            description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
            assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
            created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
        };
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false, isError: false,
            data: { ...issue, support_ticket: { id: 'tk1', ref: 'TKT-9', subject: 'Login is broken', customer: 'Acme Corp', plan: 'Pro' } },
        } as any);
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        const pill = screen.getByText(/Escalated from Support/);
        // Reset first so a failed assertion cannot leak the ticket into later tests.
        vi.mocked(hooks.useIssue).mockReturnValue({ isLoading: false, isError: false, data: { ...issue, support_ticket: null } } as any);
        expect(pill.style.color).toBe('var(--accent-ink)');
        expect(pill.style.background).toBe('var(--accent2)');
    });

    it('activity feed: shows the synthetic "Auto-linked from support ticket" row when support_ticket is set', () => {
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false,
            isError: false,
            data: {
                id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
                description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
                assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
                support_ticket: { id: 'tk1', ref: 'TKT-9', subject: 'Login is broken', customer: 'Acme Corp', plan: 'Pro' },
                created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
            },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        // The escalation banner (also shown when support_ticket is set) has its own
        // "TKT-9" ref span, so scope to the synthetic row to avoid ambiguity.
        const autoLinkRow = screen.getByText(/Auto-linked from support ticket/);
        expect(within(autoLinkRow).getByText('TKT-9')).toBeInTheDocument();

        // Reset so later tests see the default (no ticket) issue.
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false,
            isError: false,
            data: {
                id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
                description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
                assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
                support_ticket: null,
                created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
            },
        } as any);
    });
});

// ── Discriminating tests: StatusEditor ──────────────────────────────────────

describe('StatusEditor', () => {
    it('developer: clicking trigger opens menu and selecting a status calls mutateAsync with correct args', async () => {
        const spy = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useTransitionStatus).mockReturnValue({ mutateAsync: spy } as any);
        vi.mocked(authModule.useMe).mockReturnValue({
            data: { id: 'me', is_developer: true, admin_level: 'admin' },
        } as any);

        const user = userEvent.setup();
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        await user.click(screen.getByRole('button', { name: /change status/i }));
        await user.click(screen.getByRole('menuitem', { name: /in progress/i }));

        expect(spy).toHaveBeenCalledWith({ id: 'abc123', status: 'in_progress' });
    });

    it('viewer (admin_level viewer): status is read-only — no change-status button', () => {
        vi.mocked(authModule.useMe).mockReturnValue({
            data: { id: 'me', is_developer: true, admin_level: 'viewer' },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        expect(screen.queryByRole('button', { name: /change status/i })).not.toBeInTheDocument();
    });

    it('non-developer: status is read-only — no change-status button', () => {
        vi.mocked(authModule.useMe).mockReturnValue({
            data: { id: 'me', is_developer: false, admin_level: 'member' },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        expect(screen.queryByRole('button', { name: /change status/i })).not.toBeInTheDocument();
    });
});

// ── Discriminating tests: PriorityEditor ────────────────────────────────────

describe('PriorityEditor', () => {
    it('developer: clicking trigger opens menu and selecting a priority calls mutateAsync with correct args', async () => {
        const spy = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: spy } as any);
        vi.mocked(authModule.useMe).mockReturnValue({
            data: { id: 'me', is_developer: true, admin_level: 'admin' },
        } as any);

        const user = userEvent.setup();
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        await user.click(screen.getByRole('button', { name: /change priority/i }));
        await user.click(screen.getByRole('menuitem', { name: /high/i }));

        expect(spy).toHaveBeenCalledWith({ priority: 'high' });
    });

    it('viewer (admin_level viewer): priority is read-only — no change-priority button', () => {
        vi.mocked(authModule.useMe).mockReturnValue({
            data: { id: 'me', is_developer: true, admin_level: 'viewer' },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        expect(screen.queryByRole('button', { name: /change priority/i })).not.toBeInTheDocument();
    });

    it('non-developer: priority is read-only — no change-priority button', () => {
        vi.mocked(authModule.useMe).mockReturnValue({
            data: { id: 'me', is_developer: false, admin_level: 'member' },
        } as any);

        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

        expect(screen.queryByRole('button', { name: /change priority/i })).not.toBeInTheDocument();
    });
});

// ── v2 property editors ─────────────────────────────────────────────────────

describe('property editors (v2)', () => {
    const NAMES = ['Change status', 'Change priority', 'Edit assignee', 'Edit project', 'Edit release', 'Edit labels', 'Edit cycle'];

    it('developer: every trigger fills its row, hovers via classes and ends with a caret', () => {
        vi.mocked(authModule.useMe).mockReturnValue({ data: { id: 'me', is_developer: true, admin_level: 'admin' } } as any);
        render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        for (const name of NAMES) {
            const btn = screen.getByRole('button', { name });
            expect(btn.style.width, name).toBe('100%');
            expect(btn.style.background, name).toBe('');
            expect(btn.className, name).toContain('hover:bg-hover');
            expect(btn.textContent, name).toContain('▾');
            expect((btn.parentElement as HTMLElement).style.display, name).toBe('block');
        }
    });

    it('non-developer: values are plain text with no caret', () => {
        vi.mocked(authModule.useMe).mockReturnValue({ data: { id: 'me', is_developer: false, admin_level: 'member' } } as any);
        const { container } = render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });
        expect(container.textContent).not.toContain('▾');
        for (const name of NAMES) expect(screen.queryByRole('button', { name })).toBeNull();
        vi.mocked(authModule.useMe).mockReturnValue({ data: { id: 'me', is_developer: true, admin_level: 'admin' } } as any);
    });
});

// ── v2 issue page ───────────────────────────────────────────────────────────

describe('IssueDetailPage v2 layout', () => {
    const dev = () => vi.mocked(authModule.useMe).mockReturnValue({ data: { id: 'me', is_developer: true, admin_level: 'admin' } } as any);
    const renderPage = () => render(<IssueDetailPage />, { wrapper: ({ children }) => wrapper(children) });

    it('breadcrumb: an "Issues" link to / and the identifier — never the raw team id', () => {
        dev();
        renderPage();
        expect(screen.getByRole('link', { name: 'Issues' })).toHaveAttribute('href', '/');
        expect(screen.getByText('PRZ-1')).toBeInTheDocument();
        expect(screen.queryByText(/team1/)).toBeNull();
    });

    it('shows status and priority pills above the title (plus the editors in the card)', () => {
        dev();
        renderPage();
        expect(screen.getAllByText('Todo')).toHaveLength(2);
        expect(screen.getAllByText('Medium')).toHaveLength(2);
    });

    it('developer title: editable heading carrying the highlighter', () => {
        dev();
        renderPage();
        const h = screen.getByRole('heading', { level: 1 });
        expect(h.getAttribute('contenteditable')).toBe('true');
        expect(h.className).toContain('hl');
    });

    it('non-developer title: a plain h1 with a highlighted span; description keeps line breaks', () => {
        vi.mocked(authModule.useMe).mockReturnValue({ data: { id: 'me', is_developer: false, admin_level: 'member' } } as any);
        renderPage();
        const h = screen.getByRole('heading', { level: 1 });
        expect(h.tagName).toBe('H1');
        expect(h.querySelector('span.hl')?.textContent).toBe('Test Issue');
        expect(screen.getByText('Desc').style.whiteSpace).toBe('pre-wrap');
        dev();
    });

    it('clearing the title and leaving it restores the saved title without saving', () => {
        const spy = vi.fn();
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: spy } as any);
        dev();
        renderPage();
        const title = screen.getByRole('heading', { level: 1 });
        title.textContent = '';
        fireEvent.blur(title);
        expect(title.textContent).toBe('Test Issue');
        expect(spy).not.toHaveBeenCalled();
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('the activity rail heading reads "Activity"', () => {
        dev();
        renderPage();
        expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument();
        expect(screen.queryByText('Activity log')).toBeNull();
    });

    it('escalation card has the ink border + offset shadow', () => {
        dev();
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false, isError: false,
            data: {
                id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
                description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
                assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
                support_ticket: { id: 'tk1', ref: 'TKT-9', subject: 'Login is broken', customer: 'Acme Corp', plan: 'Pro' },
                created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
            },
        } as any);
        renderPage();
        const card = screen.getByText(/Escalated from Support/).parentElement as HTMLElement;
        expect(card.style.boxShadow).toBe('var(--pop-shadow)');
        expect(card.style.border).toBe('var(--line) solid var(--fg)');
        vi.mocked(hooks.useIssue).mockReturnValue({
            isLoading: false, isError: false,
            data: {
                id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
                description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
                assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
                support_ticket: null,
                created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
            },
        } as any);
    });

    it('composer: ⌘/Ctrl+Enter posts the trimmed comment; plain Enter adds a newline; blank never posts', async () => {
        const spy = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: spy, isPending: false } as any);
        dev();
        const user = userEvent.setup();
        renderPage();
        const box = screen.getByLabelText(/Leave a comment/i) as HTMLTextAreaElement;
        expect(box.tagName).toBe('TEXTAREA');

        await user.type(box, '   ');
        await user.keyboard('{Control>}{Enter}{/Control}');
        expect(spy).not.toHaveBeenCalled();

        await user.clear(box);
        await user.type(box, 'First');
        await user.keyboard('{Enter}');
        expect(spy).not.toHaveBeenCalled();
        await user.keyboard('{Control>}{Enter}{/Control}');
        expect(spy).toHaveBeenLastCalledWith('First');
        await waitFor(() => expect(box).toHaveValue(''));

        await user.type(box, 'Second');
        await user.keyboard('{Meta>}{Enter}{/Meta}');
        expect(spy).toHaveBeenLastCalledWith('Second');
        expect(spy).toHaveBeenCalledTimes(2);
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('composer: ⌘/Ctrl+Enter does nothing while a post is in flight', async () => {
        const spy = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: spy, isPending: true } as any);
        dev();
        const user = userEvent.setup();
        renderPage();
        await user.type(screen.getByLabelText(/Leave a comment/i), 'x');
        await user.keyboard('{Control>}{Enter}{/Control}');
        expect(spy).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /^Comment$/ })).toBeDisabled();
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('composer: a failed post shows an error and keeps the draft', async () => {
        const spy = vi.fn().mockRejectedValue(new Error('boom'));
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: spy, isPending: false } as any);
        dev();
        const user = userEvent.setup();
        renderPage();
        const box = screen.getByLabelText(/Leave a comment/i);
        await user.type(box, 'Hello');
        await user.keyboard('{Control>}{Enter}{/Control}');
        expect(await screen.findByText('Failed to post comment.')).toBeInTheDocument();
        expect(box).toHaveValue('Hello');
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('composer: two quick ⌘/Ctrl+Enter presses post once', async () => {
        const spy = vi.fn(() => new Promise(() => {}));   // stays in flight
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: spy, isPending: false } as any);
        dev();
        const user = userEvent.setup();
        renderPage();
        await user.type(screen.getByLabelText(/Leave a comment/i), 'Once');
        await user.keyboard('{Control>}{Enter}{/Control}{Control>}{Enter}{/Control}');
        expect(spy).toHaveBeenCalledTimes(1);
        vi.mocked(hooks.useAddComment).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('title: a changed title saves once; an unchanged one does not', () => {
        const spy = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: spy } as any);
        dev();
        renderPage();
        const title = screen.getByRole('heading', { level: 1 });
        fireEvent.blur(title);
        expect(spy).not.toHaveBeenCalled();
        title.textContent = 'Renamed issue';
        fireEvent.blur(title);
        expect(spy).toHaveBeenCalledWith({ title: 'Renamed issue' });
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('G3a: the comment box rests on the 3:1 field border and keeps its ink focus border', () => {
        renderPage();
        const classes = (screen.getByLabelText(/Leave a comment/i).parentElement as HTMLElement).className.split(' ');
        expect(classes).toContain('border-field');
        expect(classes).not.toContain('border-border2');
        expect(classes).toContain('focus-within:border-fg');
    });

    it('G3b: the properties rail is a named landmark', () => {
        renderPage();
        expect(screen.getByRole('complementary', { name: 'Issue properties' })).toBeInTheDocument();
    });

    it('G3b: the editable title shows an ink underline while focused (no edge at rest)', () => {
        dev();
        renderPage();
        const title = screen.getByRole('heading', { level: 1 });
        expect(title.className).toContain('border-transparent');
        expect(title.className).toContain('focus:border-fg');
        expect(title.style.borderStyle).toBe('solid');
    });
});
