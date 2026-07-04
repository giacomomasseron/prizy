import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IssueDetailPage from './IssueDetailPage';
// Namespace imports required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';
import * as authModule from '../../auth/useAuth';

// Minimal mocks — vi.fn() on hooks that need per-test override
vi.mock('./hooks', () => ({
    useIssue: () => ({
        isLoading: false,
        isError: false,
        data: {
            id: 'abc123', title: 'Test Issue', status: 'todo', priority: 'medium',
            description: 'Desc', team_id: 'team1', project_id: null, cycle_id: null,
            assignee_id: null, assignee: null, labels: [], identifier: 'PRZ-1',
            created_at: '2026-07-04T00:00:00Z', updated_at: '2026-07-04T00:00:00Z',
        },
    }),
    useComments: () => ({ data: { items: [] } }),
    useActivities: () => ({ data: { items: [] } }),
    useAddComment: () => ({ mutateAsync: vi.fn() }),
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
    useMembers: () => ({ data: { data: [{ id: 'm1', name: 'Alice' }] } }),
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
