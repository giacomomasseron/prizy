import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    useAddComment: () => ({ mutateAsync: vi.fn() }),
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
