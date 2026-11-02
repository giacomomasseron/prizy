import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CycleEditor } from './CycleEditor';
import type { Issue } from '../../lib/types';
// Namespace import required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';

vi.mock('./hooks', () => ({
    useUpdateIssue: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}));

vi.mock('../teams/hooks', () => ({
    useCycles: () => ({
        data: {
            items: [
                { id: 'c1', team_id: 'team1', name: 'Sprint 1', starts_at: '2026-07-01T00:00:00Z', ends_at: '2026-07-14T00:00:00Z', created_at: '', updated_at: '' },
                { id: 'c2', team_id: 'team1', name: 'Sprint 2', starts_at: '2026-07-15T00:00:00Z', ends_at: '2026-07-28T00:00:00Z', created_at: '', updated_at: '' },
            ],
        },
    }),
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

describe('CycleEditor', () => {
    beforeEach(() => {
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('developer: shows Edit cycle button', () => {
        render(<CycleEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: /Edit cycle/i })).toBeInTheDocument();
    });

    it('developer: clicking trigger shows cycle list + No cycle', async () => {
        const user = userEvent.setup();
        render(<CycleEditor issue={baseIssue} canDevelop />, { wrapper });
        await user.click(screen.getByRole('button', { name: /Edit cycle/i }));
        expect(screen.getByRole('menuitem', { name: /No cycle/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Sprint 1/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Sprint 2/i })).toBeInTheDocument();
    });

    it('developer: selecting a cycle calls useUpdateIssue.mutateAsync with { cycle_id }', async () => {
        const updateMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: updateMock } as any);

        const user = userEvent.setup();
        render(<CycleEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit cycle/i }));
        await user.click(screen.getByRole('menuitem', { name: /Sprint 1/i }));

        await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ cycle_id: 'c1' }));
    });

    it('developer: selecting No cycle calls useUpdateIssue.mutateAsync with { cycle_id: null }', async () => {
        const updateMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: updateMock } as any);

        const user = userEvent.setup();
        render(<CycleEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit cycle/i }));
        await user.click(screen.getByRole('menuitem', { name: /No cycle/i }));

        await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ cycle_id: null }));
    });

    it('viewer: read-only — no Edit cycle button', () => {
        render(<CycleEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.queryByRole('button', { name: /Edit cycle/i })).not.toBeInTheDocument();
    });

    it('shows No cycle when no cycle_id is set', () => {
        render(<CycleEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.getByText('No cycle')).toBeInTheDocument();
    });

    it('shows the current cycle name from embedded issue.cycle (bridge-safe — no list fetch needed)', () => {
        // 'Retro' is NOT in the mocked useCycles list, proving the read-only display resolves
        // from the embedded issue.cycle (agents on the bridge) rather than the gated cycles list.
        const issueWithCycle: Issue = { ...baseIssue, cycle_id: 'c9', cycle: { id: 'c9', name: 'Retro' } };
        render(<CycleEditor issue={issueWithCycle} canDevelop={false} />, { wrapper });
        expect(screen.getByText('Retro')).toBeInTheDocument();
    });
});
