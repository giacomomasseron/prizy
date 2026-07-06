import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LabelsEditor } from './LabelsEditor';
import type { Issue } from '../../lib/types';
// Namespace import required for per-test mock overrides (vi.mocked — ESM-safe, no require())
import * as hooks from './hooks';
import * as labelHooks from '../labels/hooks';

vi.mock('./hooks', () => ({
    useIssueLabels: vi.fn().mockReturnValue({ data: { items: [] } }),
    useSetIssueLabels: vi.fn().mockReturnValue({ mutateAsync: vi.fn() }),
}));

vi.mock('../labels/hooks', () => ({
    useLabels: vi.fn(),
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

describe('LabelsEditor', () => {
    beforeEach(() => {
        vi.mocked(hooks.useIssueLabels).mockReturnValue({ data: { items: [] } } as any);
        vi.mocked(hooks.useSetIssueLabels).mockReturnValue({ mutateAsync: vi.fn() } as any);
        vi.mocked(labelHooks.useLabels).mockReturnValue({
            data: {
                items: [
                    { id: 'l1', name: 'Bug', color: '#e64980', group: null, created_at: '', updated_at: '' },
                    { id: 'l2', name: 'Feature', color: '#4bab66', group: null, created_at: '', updated_at: '' },
                ],
            },
        } as any);
    });

    it('developer: shows Edit labels button', () => {
        render(<LabelsEditor issue={baseIssue} canDevelop />, { wrapper });
        expect(screen.getByRole('button', { name: /Edit labels/i })).toBeInTheDocument();
    });

    it('developer: clicking trigger shows all available labels', async () => {
        const user = userEvent.setup();
        render(<LabelsEditor issue={baseIssue} canDevelop />, { wrapper });
        await user.click(screen.getByRole('button', { name: /Edit labels/i }));
        expect(screen.getByRole('menuitem', { name: /Bug/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Feature/i })).toBeInTheDocument();
    });

    it('developer: clicking an unselected label adds it — calls mutateAsync with [labelId]', async () => {
        const setLabelsMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useSetIssueLabels).mockReturnValue({ mutateAsync: setLabelsMock } as any);
        // No current labels selected
        vi.mocked(hooks.useIssueLabels).mockReturnValue({ data: { items: [] } } as any);

        const user = userEvent.setup();
        render(<LabelsEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit labels/i }));
        await user.click(screen.getByRole('menuitem', { name: /Bug/i }));

        await waitFor(() => expect(setLabelsMock).toHaveBeenCalledWith(['l1']));
    });

    it('developer: clicking a selected label removes it — calls mutateAsync with the reduced set', async () => {
        const setLabelsMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useSetIssueLabels).mockReturnValue({ mutateAsync: setLabelsMock } as any);
        // Bug (l1) is currently selected
        vi.mocked(hooks.useIssueLabels).mockReturnValue({
            data: {
                items: [{ id: 'l1', name: 'Bug', color: '#e64980', created_at: '', updated_at: '' }],
            },
        } as any);

        const user = userEvent.setup();
        render(<LabelsEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit labels/i }));
        await user.click(screen.getByRole('menuitem', { name: /Bug/i }));

        // Removing l1 → empty array
        await waitFor(() => expect(setLabelsMock).toHaveBeenCalledWith([]));
    });

    it('developer: toggling adds to existing selected labels', async () => {
        const setLabelsMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useSetIssueLabels).mockReturnValue({ mutateAsync: setLabelsMock } as any);
        // Bug (l1) is already selected
        vi.mocked(hooks.useIssueLabels).mockReturnValue({
            data: {
                items: [{ id: 'l1', name: 'Bug', color: '#e64980', created_at: '', updated_at: '' }],
            },
        } as any);

        const user = userEvent.setup();
        render(<LabelsEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit labels/i }));
        await user.click(screen.getByRole('menuitem', { name: /Feature/i }));

        // Adding l2 to existing [l1] → [l1, l2]
        await waitFor(() => {
            const call = setLabelsMock.mock.calls[0][0] as string[];
            expect(call).toHaveLength(2);
            expect(call).toContain('l1');
            expect(call).toContain('l2');
        });
    });

    it('viewer: read-only — no Edit labels button', () => {
        render(<LabelsEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.queryByRole('button', { name: /Edit labels/i })).not.toBeInTheDocument();
    });

    it('shows No labels when no labels are selected', () => {
        render(<LabelsEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.getByText('No labels')).toBeInTheDocument();
    });

    it('shows label chips when labels are selected', () => {
        vi.mocked(hooks.useIssueLabels).mockReturnValue({
            data: {
                items: [{ id: 'l1', name: 'Bug', color: '#e64980', created_at: '', updated_at: '' }],
            },
        } as any);
        render(<LabelsEditor issue={baseIssue} canDevelop={false} />, { wrapper });
        expect(screen.getByText('Bug')).toBeInTheDocument();
    });

    it('radio-within-group: selecting a same-group label replaces the current one', async () => {
        const setLabelsMock = vi.fn().mockResolvedValue({});
        vi.mocked(hooks.useSetIssueLabels).mockReturnValue({ mutateAsync: setLabelsMock } as any);
        // Bug (a) is currently selected in group 'Type'
        vi.mocked(hooks.useIssueLabels).mockReturnValue({
            data: {
                items: [{ id: 'a', name: 'Bug', color: '#fff', group: 'Type', created_at: '', updated_at: '' }],
            },
        } as any);
        vi.mocked(labelHooks.useLabels).mockReturnValue({
            data: {
                items: [
                    { id: 'a', name: 'Bug', color: '#fff', group: 'Type', created_at: '', updated_at: '' },
                    { id: 'b', name: 'Feature', color: '#fff', group: 'Type', created_at: '', updated_at: '' },
                    { id: 'c', name: 'needs-qa', color: '#fff', group: null, created_at: '', updated_at: '' },
                ],
            },
        } as any);

        const user = userEvent.setup();
        render(<LabelsEditor issue={baseIssue} canDevelop />, { wrapper });

        await user.click(screen.getByRole('button', { name: /Edit labels/i }));
        await user.click(screen.getByRole('menuitem', { name: /Feature/i }));

        // 'a' (Bug) is dropped because same exclusive group; 'b' (Feature) added → ['b']
        await waitFor(() => expect(setLabelsMock).toHaveBeenCalledWith(['b']));
    });
});
