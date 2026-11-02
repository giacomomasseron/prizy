import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectEditor } from './ProjectEditor';
import type { Issue } from '../../lib/types';
// Namespace import required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';

vi.mock('./hooks', () => ({
    useUpdateIssue: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}));

vi.mock('../projects/hooks', () => ({
    useProjects: () => ({
        data: {
            items: [
                { id: 'p1', name: 'Alpha', color: '#6d69f2', status: 'in_progress', description: null, icon: null, team_id: null, start_date: null, target_date: null, created_by: 'me', created_at: '', updated_at: '' },
                { id: 'p2', name: 'Beta', color: '#4bab66', status: 'planning', description: null, icon: null, team_id: null, start_date: null, target_date: null, created_by: 'me', created_at: '', updated_at: '' },
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

describe('ProjectEditor', () => {
    beforeEach(() => {
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: vi.fn() } as any);
    });

    it('developer: shows Edit project button', () => {
        render(<ProjectEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: /Edit project/i })).toBeInTheDocument();
    });

    it('developer: clicking trigger shows project list + No project', async () => {
        const user = userEvent.setup();
        render(<ProjectEditor issue={baseIssue} canDevelop />, { wrapper });
        await user.click(screen.getByRole('button', { name: /Edit project/i }));
        expect(screen.getByRole('menuitem', { name: /No project/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Alpha/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Beta/i })).toBeInTheDocument();
    });

    it('developer: selecting a project calls useUpdateIssue.mutateAsync with { project_id }', async () => {
        const updateMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: updateMock } as any);

        const user = userEvent.setup();
        render(<ProjectEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit project/i }));
        await user.click(screen.getByRole('menuitem', { name: /Alpha/i }));

        await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ project_id: 'p1' }));
    });

    it('developer: selecting No project calls useUpdateIssue.mutateAsync with { project_id: null }', async () => {
        const updateMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useUpdateIssue).mockReturnValue({ mutateAsync: updateMock } as any);

        const user = userEvent.setup();
        render(<ProjectEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit project/i }));
        await user.click(screen.getByRole('menuitem', { name: /No project/i }));

        await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ project_id: null }));
    });

    it('viewer: read-only — no Edit project button', () => {
        render(<ProjectEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.queryByRole('button', { name: /Edit project/i })).not.toBeInTheDocument();
    });

    it('shows No project when no project_id is set', () => {
        render(<ProjectEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.getByText('No project')).toBeInTheDocument();
    });

    it('shows the current project name from embedded issue.project (bridge-safe — no list fetch needed)', () => {
        // 'Gamma' is NOT in the mocked useProjects list, proving the read-only display resolves
        // from the embedded issue.project (which an agent on the bridge gets) rather than the
        // is_developer-gated /v1/projects list.
        const issueWithProject: Issue = { ...baseIssue, project_id: 'p9', project: { id: 'p9', name: 'Gamma', color: '#abcabc' } };
        render(<ProjectEditor issue={issueWithProject} canDevelop={false} />, { wrapper });
        expect(screen.getByText('Gamma')).toBeInTheDocument();
    });
});
