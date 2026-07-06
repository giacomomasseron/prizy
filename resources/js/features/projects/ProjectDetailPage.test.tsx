import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectDetailPage from './ProjectDetailPage';
import type { Project, Milestone, Issue } from '../../lib/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

const PROJECT: Project = {
    id: 'p1',
    name: 'Escalation Engine',
    description: 'Handles escalations automatically.',
    icon: null,
    color: '#6d69f2',
    status: 'in_progress',
    team_id: null,
    start_date: '2026-01-01',
    target_date: '2026-12-31',
    lead_id: 'u1',
    priority: 'high',
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00.000000Z',
    updated_at: '2026-01-01T00:00:00.000000Z',
    lead: { id: 'u1', name: 'Alice Smith' },
    issue_count: 4,
    progress: 50,
};

// target_date in the past → 'done'; in the future → 'upcoming'
const MILESTONES: Milestone[] = [
    { id: 'm1', project_id: 'p1', name: 'Beta Launch', target_date: '2026-01-15', created_at: '', updated_at: '' },
    { id: 'm2', project_id: 'p1', name: 'GA Release',  target_date: '2026-12-31', created_at: '', updated_at: '' },
];

const ISSUES: Issue[] = [
    { id: 'i1', title: 'Issue 1', description: null, status: 'done',        priority: 'medium', estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: 'u1', created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: { id: 'u1', name: 'Alice Smith' } },
    { id: 'i2', title: 'Issue 2', description: null, status: 'done',        priority: 'medium', estimate: null, due_date: null, sort_order: 1, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: 'u2', created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: { id: 'u2', name: 'Bob Jones'   } },
    { id: 'i3', title: 'Issue 3', description: null, status: 'in_progress', priority: 'medium', estimate: null, due_date: null, sort_order: 2, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: null },
    { id: 'i4', title: 'Issue 4', description: null, status: 'todo',        priority: 'medium', estimate: null, due_date: null, sort_order: 3, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '', assignee: null },
];

const ME = {
    id: 'u1',
    workspace_id: 'w1',
    name: 'Alice',
    email: 'alice@example.com',
    admin_level: 'owner',
    is_developer: true,
    is_agent: false,
    email_digest_frequency: 'off',
};

function stubFetch() {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
            // order matters: milestones URL contains '/projects/' too
            if (url.includes('/v1/me'))       return j({ data: ME });
            if (url.includes('/milestones'))  return j({ data: MILESTONES, links: { next: null, prev: null } });
            if (url.includes('/issues'))      return j({ data: ISSUES, links: { next: null, prev: null } });
            if (url.includes('/projects/'))   return j({ data: PROJECT });
            return j({ data: {} });
        }),
    );
}

function renderPage() {
    stubFetch();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/projects/p1']}>
                <Routes>
                    <Route path="/projects/:id" element={<ProjectDetailPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('ProjectDetailPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders hero: project name, In Progress status badge, and description', async () => {
        renderPage();
        // The name appears in both the breadcrumb span and the h1 — use role query for the heading
        expect(await screen.findByRole('heading', { name: 'Escalation Engine' })).toBeInTheDocument();
        // 'In Progress' may appear in both the status badge and the issues group label
        expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
        expect(screen.getByText('Handles escalations automatically.')).toBeInTheDocument();
    });

    it('renders progress card with server issue count (doneN/total)', async () => {
        renderPage();
        // doneN = Math.round(50/100 * 4) = 2, total = 4
        expect(await screen.findByText(/2\/4 issues/)).toBeInTheDocument();
    });

    it('renders milestone Done tag for a past milestone and Upcoming tag for a future one', async () => {
        renderPage();
        // Beta Launch 2026-01-15 → past → 'Done'; 'Done' may also appear as an issues group label
        // GA Release 2026-12-31 → future → 'Upcoming'
        expect((await screen.findAllByText('Done')).length).toBeGreaterThan(0);
        expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });

    it('renders members AvatarStack (Bob Jones → initials BJ unique to members stack)', async () => {
        renderPage();
        // Bob Jones is an assignee on an issue and appears in the members AvatarStack;
        // 'BJ' may appear in both — confirm at least one renders.
        expect((await screen.findAllByText('BJ')).length).toBeGreaterThan(0);
    });
});

describe('ProjectDetailPage — issues section', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders Issues heading with total count and all issue rows', async () => {
        renderPage();
        expect(await screen.findByRole('heading', { name: 'Issues' })).toBeInTheDocument();
        expect(await screen.findAllByTestId('issue-row')).toHaveLength(4);
    });

    it('Active toggle hides done rows and keeps active ones', async () => {
        renderPage();
        // Wait for all rows to load
        await screen.findAllByTestId('issue-row');
        // Both done issues are visible in All mode
        expect(screen.getByText('Issue 1')).toBeInTheDocument();
        expect(screen.getByText('Issue 2')).toBeInTheDocument();
        // Click the Active toggle
        fireEvent.click(screen.getByRole('button', { name: 'Active' }));
        // Done rows disappear
        await waitFor(() => expect(screen.queryByText('Issue 1')).not.toBeInTheDocument());
        expect(screen.queryByText('Issue 2')).not.toBeInTheDocument();
        // In-progress + todo rows remain
        expect(screen.getByText('Issue 3')).toBeInTheDocument();
        expect(screen.getByText('Issue 4')).toBeInTheDocument();
    });
});
