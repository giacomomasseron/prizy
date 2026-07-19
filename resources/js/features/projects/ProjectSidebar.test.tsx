import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectSidebar } from './ProjectSidebar';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function renderSidebar(path = '/projects/p1/issues') {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/members')) return j({ data: [] });
        if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex', email: 'a@e.com', admin_level: 'member', is_developer: false, is_agent: false, email_digest_frequency: 'off' } });
        if (url.includes('/milestones')) return j({ data: [{ id: 'm1', project_id: 'p1', name: 'M', target_date: '2099-01-01', created_at: '', updated_at: '' }], links: { next: null } });
        if (url.includes('/issues')) return j({ data: [{ id: 'i1', title: 'x', status: 'todo', priority: 'low', description: null, estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '' }], links: { next: null } });
        // projects list (page shape) and single project
        if (/\/projects\/p1(\?|$)/.test(url)) return j({ data: { id: 'p1', name: 'Escalation Engine', color: '#6d69f2', status: 'in_progress', description: null, icon: null, team_id: null, start_date: null, target_date: null, lead_id: null, priority: 'high', created_by: 'u1', created_at: '', updated_at: '' } });
        if (url.includes('/projects')) return j({ data: [{ id: 'p1', name: 'Escalation Engine', color: '#6d69f2' }, { id: 'p2', name: 'Unified Inbox', color: '#5b8def' }], links: { next: null } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><Routes><Route path="/projects/:id/*" element={<ProjectSidebar projectId="p1" />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('ProjectSidebar', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('renders the four sub-nav links', async () => {
        renderSidebar();
        for (const label of ['Overview', 'Issues', 'Cycles', 'Roadmap']) {
            expect(await screen.findByRole('link', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
        }
    });
    it('renders "All projects" back link and a switch-project list', async () => {
        renderSidebar();
        expect(await screen.findByRole('link', { name: /All projects/ })).toBeInTheDocument();
        expect(await screen.findByRole('link', { name: /Unified Inbox/ })).toBeInTheDocument();
    });
    it('marks the active sub-nav link (Issues) as current', async () => {
        renderSidebar('/projects/p1/issues');
        const issues = await screen.findByRole('link', { name: /^Issues/ });
        expect(issues).toHaveAttribute('aria-current', 'page');
    });
});
