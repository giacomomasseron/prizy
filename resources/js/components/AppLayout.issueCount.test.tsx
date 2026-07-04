import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../auth/useAuth', () => ({
    useMe: () => ({ data: { id: 'u1', name: 'Test User', admin_level: 'member', is_developer: false } }),
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
                    cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1',
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

describe('AppLayout issues count badge', () => {
    it('shows active issue count (excludes done/cancelled) next to Issues nav', () => {
        mountLayout();
        // 1 active (in_progress), 1 done — badge should show "1"
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('badge count matches exactly the number of non-done non-cancelled issues', () => {
        mountLayout();
        // Verify we get exactly the count "1" (not "2" which would include done)
        const badge = screen.getByText('1');
        expect(badge).toBeInTheDocument();
        expect(screen.queryByText('2')).toBeNull();
    });
});
