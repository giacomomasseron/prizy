import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectOverview from './ProjectOverview';
import type { Project, Milestone, Issue } from '../../lib/types';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }

const PROJECT: Project = { id: 'p1', name: 'Escalation Engine', description: 'Handles escalations automatically.', icon: null, color: '#6d69f2', status: 'in_progress', team_id: null, start_date: '2026-01-01', target_date: '2026-12-31', lead_id: 'u1', priority: 'high', created_by: 'u1', created_at: '2026-01-01T00:00:00.000000Z', updated_at: '2026-01-01T00:00:00.000000Z', lead: { id: 'u1', name: 'Alice Smith' }, issue_count: 4, progress: 50 };
const MILESTONES: Milestone[] = [
    { id: 'm1', project_id: 'p1', name: 'Beta Launch', target_date: '2026-01-15', created_at: '', updated_at: '' },
    { id: 'm2', project_id: 'p1', name: 'GA Release', target_date: '2099-12-31', created_at: '', updated_at: '' },
];
const ISSUES: Issue[] = [
    { id: 'i1', title: 'Issue 1', description: null, status: 'done', priority: 'medium', estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: 'u1', created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: { id: 'u1', name: 'Alice Smith' } },
    { id: 'i2', title: 'Issue 2', description: null, status: 'done', priority: 'medium', estimate: null, due_date: null, sort_order: 1, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: 'u2', created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: { id: 'u2', name: 'Bob Jones' } },
    { id: 'i3', title: 'Issue 3', description: null, status: 'in_progress', priority: 'medium', estimate: null, due_date: null, sort_order: 2, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: null },
    { id: 'i4', title: 'Issue 4', description: null, status: 'todo', priority: 'medium', estimate: null, due_date: null, sort_order: 3, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: null },
];
const ME = { id: 'u1', workspace_id: 'w1', name: 'Alice', email: 'a@e.com', admin_level: 'owner', is_developer: true, is_agent: false, email_digest_frequency: 'off' };

function stubFetch(opts: { issues?: Issue[]; milestones?: Milestone[]; me?: object } = {}) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/v1/me')) return j({ data: opts.me ?? ME });
        if (url.includes('/milestones')) return j({ data: opts.milestones ?? MILESTONES, links: { next: null, prev: null } });
        if (url.includes('/issues')) return j({ data: opts.issues ?? ISSUES, links: { next: null, prev: null } });
        if (url.includes('/projects/')) return j({ data: PROJECT });
        return j({ data: {} });
    }));
}
function renderView(opts?: Parameters<typeof stubFetch>[0]) {
    stubFetch(opts);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/projects/p1']}><Routes><Route path="/projects/:id" element={<ProjectOverview />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('ProjectOverview', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('renders hero: name, In Progress pill, description', async () => {
        renderView();
        expect(await screen.findByRole('heading', { name: 'Escalation Engine' })).toBeInTheDocument();
        expect(within(screen.getByTestId('project-status-pill')).getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Handles escalations automatically.')).toBeInTheDocument();
    });
    it('renders progress card with server count 2/4 issues', async () => {
        renderView();
        expect(await screen.findByText(/2\/4 issues/)).toBeInTheDocument();
    });
    it('renders Done + Upcoming milestone tags', async () => {
        renderView();
        const tags = await screen.findAllByTestId('milestone-tag');
        expect(tags.map((t) => t.textContent)).toEqual(expect.arrayContaining(['Done', 'Upcoming']));
    });
    it('renders members AvatarStack (Bob Jones → BJ)', async () => {
        renderView();
        const stack = await screen.findByTestId('members-stack');
        expect(within(stack).getByText('BJ')).toBeInTheDocument();
    });
    it('renders empty progress bar with 0 issues', async () => {
        renderView({ issues: [], milestones: [] });
        await screen.findByRole('heading', { name: 'Escalation Engine' });
        expect(screen.getByTestId('progress-empty')).toBeInTheDocument();
    });
    it('shows the New milestone (+) control for a developer', async () => {
        renderView();
        expect(await screen.findByRole('button', { name: 'New milestone' })).toBeInTheDocument();
    });
    it('hides milestone create/delete controls for a non-developer', async () => {
        renderView({ me: { ...ME, admin_level: 'member', is_developer: false } });
        await screen.findByRole('heading', { name: 'Escalation Engine' });
        expect(screen.queryByRole('button', { name: 'New milestone' })).toBeNull();
        expect(screen.queryByRole('button', { name: /^Delete / })).toBeNull();
    });
});
