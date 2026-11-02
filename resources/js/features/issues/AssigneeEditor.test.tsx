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

// Signed in as Bob Jones.
let me: { id: string; name: string } | undefined = { id: 'm2', name: 'Bob Jones' };
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: me }) }));

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
        me = { id: 'm2', name: 'Bob Jones' };
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

describe('AssigneeEditor: Assign to me (Issue v2)', () => {
    beforeEach(() => { me = { id: 'm2', name: 'Bob Jones' }; });

    it('a button beside the assignee assigns you, and focus waits on the assignee', async () => {
        const assignMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useAssignIssue).mockReturnValue({ mutateAsync: assignMock } as any);
        const user = userEvent.setup();
        render(<div data-testid="row"><AssigneeEditor issue={{ ...baseIssue, assignee_id: 'm1', assignee: { id: 'm1', name: 'Alice' } }} canDevelop /></div>, { wrapper });

        const trigger = screen.getByRole('button', { name: /Edit assignee/i });
        const quick = screen.getByRole('button', { name: 'Assign to me' });
        // Beside the editor in the property row, 6px from the panel's edge (the row pads 12px).
        expect(trigger.contains(quick)).toBe(false);
        expect(quick.parentElement).toBe(screen.getByTestId('row'));
        expect(quick.style.marginRight).toBe('-6px');
        expect(quick.className).toContain('hover:bg-hi');

        await user.click(quick);
        expect(assignMock.mock.calls).toEqual([['m2']]);
        expect(trigger).toHaveFocus();
    });

    it('goes while it saves you, and stays while someone else is being saved', () => {
        vi.mocked(hooks.useAssignIssue).mockReturnValue({ mutateAsync: vi.fn(), isPending: true, variables: 'm2' } as any);
        const { unmount } = render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        unmount();

        vi.mocked(hooks.useAssignIssue).mockReturnValue({ mutateAsync: vi.fn(), isPending: true, variables: 'm1' } as any);
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
    });

    it('the name ends in … rather than pushing the caret under Assign to me (Issue v2)', () => {
        const long: Issue = { ...baseIssue, assignee_id: 'm1', assignee: { id: 'm1', name: 'Alice' } };
        const { unmount } = render(<AssigneeEditor issue={long} canDevelop />, { wrapper });
        for (const pass of ['editable', 'read-only']) {
            const name = screen.getByText('Alice');
            expect(name.style.overflow, pass).toBe('hidden');
            expect(name.style.textOverflow, pass).toBe('ellipsis');
            expect(name.style.whiteSpace, pass).toBe('nowrap');
            expect(name.style.minWidth, pass).toBe('0px');
            if (pass === 'editable') { unmount(); render(<AssigneeEditor issue={long} canDevelop={false} />, { wrapper }); }
        }
    });

    it('shows on an unassigned issue too', () => {
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
    });

    it('is not offered when the issue is yours, to a viewer, or before you are known', () => {
        const mine: Issue = { ...baseIssue, assignee_id: 'm2', assignee: { id: 'm2', name: 'Bob Jones' } };
        const { unmount } = render(<AssigneeEditor issue={mine} canDevelop />, { wrapper });
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        unmount();

        const viewer = render(<AssigneeEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        viewer.unmount();

        me = undefined;
        render(<AssigneeEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
    });
});
