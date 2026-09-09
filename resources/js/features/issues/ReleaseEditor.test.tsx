import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReleaseEditor } from './ReleaseEditor';
import type { Issue } from '../../lib/types';
// Namespace imports required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';
import * as releaseHooks from '../releases/hooks';

vi.mock('./hooks', () => ({
    useUpdateIssue: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}));

// vi.fn() (not a fixed object, unlike ProjectEditor/CycleEditor's mocks) so we can assert the
// `enabled` arg the component passes — proving the viewer path never enables the list fetch.
vi.mock('../releases/hooks', () => ({
    useReleases: vi.fn(),
}));

const releaseFixtures = [
    { id: 'r1', name: '2026.1', description: null, target_date: null, shipped_at: null, created_at: '', rollup: { total: 0, done: 0, cancelled: 0, pct: null } },
    { id: 'r2', name: '2026.0', description: null, target_date: null, shipped_at: '2026-01-01T00:00:00Z', created_at: '', rollup: { total: 4, done: 4, cancelled: 0, pct: 100 } },
];

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

describe('ReleaseEditor', () => {
    beforeEach(() => {
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: vi.fn() } as any);
        vi.mocked(releaseHooks.useReleases).mockReturnValue({ data: releaseFixtures } as any);
    });

    it('developer: shows Edit release button', () => {
        render(<ReleaseEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: /Edit release/i })).toBeInTheDocument();
    });

    it('developer: clicking trigger shows release list + No release', async () => {
        const user = userEvent.setup();
        render(<ReleaseEditor issue={baseIssue} canDevelop />, { wrapper });
        await user.click(screen.getByRole('button', { name: /Edit release/i }));
        expect(screen.getByRole('menuitem', { name: /No release/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: '2026.1' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: '2026.0' })).toBeInTheDocument();
    });

    it('developer: selecting a release calls useUpdateIssue.mutateAsync with { release_id }', async () => {
        const updateMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: updateMock } as any);

        const user = userEvent.setup();
        render(<ReleaseEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit release/i }));
        await user.click(screen.getByRole('menuitem', { name: '2026.1' }));

        await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ release_id: 'r1' }));
    });

    it('developer: selecting No release calls useUpdateIssue.mutateAsync with { release_id: null }', async () => {
        const updateMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: updateMock } as any);

        const user = userEvent.setup();
        render(<ReleaseEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit release/i }));
        await user.click(screen.getByRole('menuitem', { name: /No release/i }));

        await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ release_id: null }));
    });

    it('viewer: read-only — no Edit release button, and the list fetch is never enabled', () => {
        render(<ReleaseEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.queryByRole('button', { name: /Edit release/i })).not.toBeInTheDocument();
        expect(releaseHooks.useReleases).toHaveBeenCalledWith({ enabled: false });
    });

    it('shows No release when no release_id is set', () => {
        render(<ReleaseEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.getByText('No release')).toBeInTheDocument();
    });

    it('shows the current release name + ⛴ from embedded issue.release (bridge-safe — no list fetch needed)', () => {
        // 'Gamma' is NOT in the mocked useReleases list, proving the read-only display resolves
        // from the embedded issue.release (which an agent on the bridge gets) rather than the
        // is_developer-gated /v1/releases list.
        const issueWithRelease: Issue = { ...baseIssue, release_id: 'r9', release: { id: 'r9', name: 'Gamma', shipped_at: null } };
        render(<ReleaseEditor issue={issueWithRelease} canDevelop={false} />, { wrapper });
        expect(screen.getByText(/⛴/)).toBeInTheDocument();
        expect(screen.getByText(/Gamma/)).toBeInTheDocument();
    });

    it('shows a shipped checkmark suffix when issue.release.shipped_at is set', () => {
        const issueWithShipped: Issue = { ...baseIssue, release_id: 'r9', release: { id: 'r9', name: 'Gamma', shipped_at: '2026-01-01T00:00:00Z' } };
        render(<ReleaseEditor issue={issueWithShipped} canDevelop={false} />, { wrapper });
        expect(screen.getByText(/Gamma.*✓/)).toBeInTheDocument();
    });
});
