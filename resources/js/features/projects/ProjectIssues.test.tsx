import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectIssues from './ProjectIssues';
import type { Project, Issue } from '../../lib/types';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
const PROJECT: Project = { id: 'p1', name: 'Escalation Engine', description: null, icon: null, color: '#6d69f2', status: 'in_progress', team_id: null, start_date: null, target_date: null, lead_id: null, priority: 'high', created_by: 'u1', created_at: '', updated_at: '', issue_count: 4, progress: 50 };
const base = { description: null, estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '' } as const;
const ISSUES: Issue[] = [
    { ...base, id: 'i1', title: 'Issue 1', status: 'done', priority: 'medium', assignee_id: 'u1', assignee: { id: 'u1', name: 'Alice Smith' } },
    { ...base, id: 'i2', title: 'Issue 2', status: 'done', priority: 'high', assignee_id: 'u2', assignee: { id: 'u2', name: 'Bob Jones' } },
    { ...base, id: 'i3', title: 'Issue 3', status: 'in_progress', priority: 'urgent', assignee_id: null, assignee: null },
    { ...base, id: 'i4', title: 'Issue 4', status: 'todo', priority: 'low', assignee_id: null, assignee: null },
];
function stub(issues: Issue[] = ISSUES) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/issues')) return j({ data: issues, links: { next: null } });
        if (url.includes('/projects/')) return j({ data: PROJECT });
        return j({ data: {} });
    }));
}
function renderView(issues?: Issue[]) {
    stub(issues);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/projects/p1/issues']}><Routes><Route path="/projects/:id/issues" element={<ProjectIssues />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('ProjectIssues', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('renders heading, count, and all rows', async () => {
        renderView();
        expect(await screen.findByRole('heading', { name: 'Issues' })).toBeInTheDocument();
        expect(await screen.findAllByTestId('issue-row')).toHaveLength(4);
        expect(screen.getByTestId('issues-count')).toHaveTextContent('4');
    });
    it('Active status chip hides done rows', async () => {
        renderView();
        await screen.findAllByTestId('issue-row');
        fireEvent.click(screen.getByRole('button', { name: 'Active' }));
        await waitFor(() => expect(screen.queryByText('Issue 1')).not.toBeInTheDocument());
        expect(screen.queryByText('Issue 2')).not.toBeInTheDocument();
        expect(screen.getByText('Issue 3')).toBeInTheDocument();
        expect(screen.getByText('Issue 4')).toBeInTheDocument();
    });
    it('Priority=Urgent narrows to the urgent issue', async () => {
        renderView();
        await screen.findAllByTestId('issue-row');
        fireEvent.click(screen.getByRole('button', { name: 'Urgent' }));
        await waitFor(() => expect(screen.queryByText('Issue 1')).not.toBeInTheDocument());
        expect(screen.getByText('Issue 3')).toBeInTheDocument();
    });
    it('never renders a cancelled row or Cancelled group label', async () => {
        renderView([ISSUES[0], ISSUES[2], { ...ISSUES[3], id: 'ix', title: 'Cancelled X', status: 'cancelled' }]);
        await screen.findAllByTestId('issue-row');
        expect(screen.queryByText('Cancelled X')).not.toBeInTheDocument();
        expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
        await waitFor(() => expect(screen.queryByText('Cancelled X')).not.toBeInTheDocument());
        expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
    });
    it('shows the empty state when a filter matches nothing', async () => {
        renderView([ISSUES[0]]); // only a done issue
        await screen.findByRole('heading', { name: 'Issues' });
        fireEvent.click(screen.getByRole('button', { name: 'Active' }));
        expect(await screen.findByText('No issues match these filters.')).toBeInTheDocument();
    });
});
