import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../auth/useAuth', () => ({
    // is_developer: true — this fixture exercises the My issues count, not tracker authorization (see
    // GlobalSidebar.test.tsx); a non-developer member has no My issues row at all.
    useMe: () => ({ data: { id: 'u1', name: 'Test User', admin_level: 'member', is_developer: true } }),
    useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('../features/notifications/hooks', () => ({ useUnreadCount: () => ({ data: { count: 0 } }) }));
vi.mock('../features/notifications/useRealtime', () => ({ useRealtimeNotifications: () => {} }));
vi.mock('../features/issues/hooks', () => ({
    useIssues: () => ({
        data: {
            items: [
                {
                    id: 'i1', status: 'in_progress', title: 'A', priority: 'low', description: null,
                    estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: null,
                    cycle_id: null, parent_issue_id: null, assignee_id: 'u1', created_by: 'u1',
                    archived_at: null, labels: [],
                    created_at: '2026-07-04T00:00:00.000000Z', updated_at: '2026-07-04T00:00:00.000000Z',
                },
                {
                    id: 'i2', status: 'done', title: 'B', priority: 'low', description: null,
                    estimate: null, due_date: null, sort_order: 1, team_id: 't1', project_id: null,
                    cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1',
                    archived_at: null, labels: [],
                    created_at: '2026-07-04T00:00:00.000000Z', updated_at: '2026-07-04T00:00:00.000000Z',
                },
            ],
            next: null,
        },
    }),
}));
vi.mock('../features/issues/useIssueDrawers', () => ({
    useIssueDrawers: () => ({ peekId: null, createOpen: false, createStatus: null, openCreate: vi.fn(), close: vi.fn() }),
}));
vi.mock('../features/search/CommandPalette', () => ({ default: () => null }));
vi.mock('../features/issues/PeekDrawer', () => ({ PeekDrawer: () => null }));
vi.mock('../features/issues/CreateIssueDrawer', () => ({ CreateIssueDrawer: () => null }));

import AppLayout from './AppLayout';

function mountLayout() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('AppLayout: the My issues count', () => {
    it('counts the issues assigned to you, and the Issues row carries no count', () => {
        mountLayout();
        // Two issues in the list; one is yours.
        expect(screen.getByTestId('my-issues-count').textContent).toBe('1');
        expect(screen.getByRole('link', { name: 'Issues' })).toHaveTextContent(/^Issues$/);
        expect(screen.queryByText('2')).toBeNull();
    });
});
