import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssigneeEditor } from './AssigneeEditor';
import type { Issue } from '../../lib/types';
// Namespace import required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';

vi.mock('./hooks', () => ({
    useAssignIssue: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}));

vi.mock('../members/hooks', () => ({
    useMembers: () => ({ data: [{ id: 'm1', name: 'Alice' }, { id: 'm2', name: 'Bob Jones' }] }),
}));

const baseIssue: Issue = {
    id: 'abc123',
    title: 'Test Issue',
    status: 'todo',
    priority: 'medium',
    description: null,
    team_id: 'team1',
    project_id: null,
    cycle_id: null,
    assignee_id: null,
    assignee: null,
    labels: [],
    identifier: 'PRZ-1',
    estimate: null,
    due_date: null,
    sort_order: 0,
    parent_issue_id: null,
    created_by: 'me',
    archived_at: null,
    created_at: '2026-07-04T00:00:00Z',
    updated_at: '2026-07-04T00:00:00Z',
};

function wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('AssigneeEditor', () => {
    beforeEach(() => {
        vi.mocked(hooks.useAssignIssue).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('developer: shows Edit assignee button', () => {
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: /Edit assignee/i })).toBeInTheDocument();
    });

    it('developer: clicking trigger shows member list + Unassigned', async () => {
        const user = userEvent.setup();
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });
        await user.click(screen.getByRole('button', { name: /Edit assignee/i }));
        expect(screen.getByRole('menuitem', { name: /Unassigned/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Alice/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Bob Jones/i })).toBeInTheDocument();
    });

    it('developer: selecting a member calls useAssignIssue.mutateAsync with member id', async () => {
        const assignMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useAssignIssue).mockReturnValue({ mutateAsync: assignMock } as any);

        const user = userEvent.setup();
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit assignee/i }));
        await user.click(screen.getByRole('menuitem', { name: /Alice/i }));

        await waitFor(() => expect(assignMock).toHaveBeenCalledWith('m1'));
    });

    it('developer: selecting Unassigned calls useAssignIssue.mutateAsync with null', async () => {
        const assignMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useAssignIssue).mockReturnValue({ mutateAsync: assignMock } as any);

        const user = userEvent.setup();
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit assignee/i }));
        await user.click(screen.getByRole('menuitem', { name: /Unassigned/i }));

        await waitFor(() => expect(assignMock).toHaveBeenCalledWith(null));
    });

    it('viewer: read-only — no Edit assignee button', () => {
        render(<AssigneeEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.queryByRole('button', { name: /Edit assignee/i })).not.toBeInTheDocument();
    });

    it('viewer: shows assignee name in read-only mode', () => {
        const issueWithAssignee: Issue = {
            ...baseIssue,
            assignee_id: 'm1',
            assignee: { id: 'm1', name: 'Alice' },
        };
        render(<AssigneeEditor issue={issueWithAssignee} canDevelop={false} />, { wrapper });
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('shows Unassigned when no assignee is set', () => {
        render(<AssigneeEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
});
