import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { PlanItem, Project } from '../../lib/types';
import { TodaySidebar } from './TodaySidebar';

// Today v2: the Today page's own left bar.
function j(body: unknown) {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function project(id: string, name: string, color = '#5b8def'): Project {
    return {
        id, name, color, description: null, icon: null, status: 'in_progress', team_id: null, start_date: null, target_date: null,
        lead_id: null, priority: 'no_priority', created_by: 'u1', created_at: '', updated_at: '',
    };
}

function planned(id: string, proj: { id: string; name: string; color: string } | null): PlanItem {
    return {
        issue: { id, identifier: `PRZ-${id.toUpperCase()}`, title: id, status: 'todo', priority: 'no_priority', estimate: null, project: proj },
        minutes: 60, position: 1, tag: null, reason: null, can_undo: false,
    };
}

interface World { developer?: boolean; unread?: number; items?: PlanItem[]; projects?: Project[]; teams?: { id: string; name: string }[] }
let fetchMock: ReturnType<typeof vi.fn>;

function stub({ developer = true, unread = 0, items = [], projects = [], teams = [{ id: 't1', name: 'Platform team' }] }: World = {}) {
    fetchMock = vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes('/members')) return j({ data: [] });
        if (u.includes('/me/plan')) return j({ data: { capacity_minutes: 360, items, done_today: [] } });
        if (u.endsWith('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex Rivera', email: 'a@e.com', admin_level: 'member', is_developer: developer, is_agent: false, email_digest_frequency: 'off' } });
        if (u.includes('/unread-count')) return j({ data: { count: unread } });
        if (u.includes('/teams')) return j({ data: teams.map((t) => ({ ...t, identifier: 'PLT', color: '#6d69f2', created_at: '', updated_at: '' })), links: { next: null } });
        if (u.includes('/projects')) return j({ data: projects, links: { next: null } });
        return j({ data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
}

function Where() {
    const loc = useLocation();
    return <output data-testid="where">{loc.pathname + loc.search}</output>;
}

function renderSidebar(world: World = {}, onHide = () => {}) {
    stub(world);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/today']}>
                <Routes><Route path="*" element={<><TodaySidebar onHide={onHide} /><Where /></>} /></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
afterEach(() => { vi.unstubAllGlobals(); });

describe('Today v2: the left bar', () => {
    it('shows the name, a Hide button with its [ shortcut, and + New issue (no search, no C hint)', async () => {
        const onHide = vi.fn();
        const user = userEvent.setup();
        renderSidebar({}, onHide);

        expect(screen.getByText('Prizy')).toBeInTheDocument();
        const hide = screen.getByRole('button', { name: 'Hide sidebar' });
        expect(hide).toHaveAttribute('title', 'Hide sidebar ( [ )');
        expect(hide).toHaveTextContent('«');
        await user.click(hide);
        expect(onHide).toHaveBeenCalledOnce();

        const create = await screen.findByRole('button', { name: '+ New issue' });
        await user.click(create);
        expect(screen.getByTestId('where')).toHaveTextContent('/today?create=1');
        expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
    });

    it('offers + New issue only to those who can create issues', async () => {
        renderSidebar({ developer: false });
        await screen.findByText('Alex Rivera');
        expect(screen.queryByRole('button', { name: '+ New issue' })).toBeNull();
    });

    it('lists Today (current, with the plan count), My issues, Inbox and a disabled Escalations', async () => {
        renderSidebar({ items: [planned('a', null), planned('b', null)] });
        const nav = within(screen.getByRole('navigation', { name: 'Your work' }));

        const today = nav.getByRole('link', { name: /Today/ });
        expect(today).toHaveAttribute('href', '/today');
        expect(today).toHaveAttribute('aria-current', 'page');
        await waitFor(() => expect(within(today).getByTestId('today-badge')).toHaveTextContent('2'));
        await waitFor(() => expect(nav.getByRole('link', { name: 'My issues' })).toHaveAttribute('href', '/issues?assignee_id=u1'));
        expect(nav.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/notifications');
        const escalations = nav.getByRole('button', { name: 'Escalations' });
        expect(escalations).toBeDisabled();
        expect(escalations).toHaveAttribute('title', 'Coming soon');
    });

    it('shows the Today count even at 0', async () => {
        renderSidebar();
        await waitFor(() => expect(screen.getByTestId('today-badge')).toHaveTextContent('0'));
    });

    it('shows the unread count on Inbox in red, and none when everything is read', async () => {
        renderSidebar({ unread: 4 });
        const inbox = await screen.findByRole('link', { name: 'Inbox, 4 unread' });
        const badge = within(inbox).getByText('4');
        expect(badge.style.background).toBe('var(--red)');
        expect(badge.style.color).toBe('var(--on-accent)');
    });

    it('hides the unread count at 0', async () => {
        renderSidebar({ unread: 0 });
        await screen.findByText('Alex Rivera');
        await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/unread-count'))).toBe(true));
        expect(screen.getByRole('link', { name: 'Inbox' })).toHaveTextContent(/^Inbox$/);
    });

    it('lists Workspace: Issues, your team\'s Cycles and Projects', async () => {
        renderSidebar();
        const nav = within(screen.getByRole('navigation', { name: 'Workspace' }));
        expect(nav.getByRole('link', { name: 'Issues' })).toHaveAttribute('href', '/issues');
        await waitFor(() => expect(nav.getByRole('link', { name: 'Cycles' })).toHaveAttribute('href', '/teams/t1/cycles'));
        expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    });

    it('sends Cycles to the team list when you are in no team', async () => {
        renderSidebar({ teams: [] });
        await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/teams'))).toBe(true));
        expect(screen.getByRole('link', { name: 'Cycles' })).toHaveAttribute('href', '/teams');
    });

    it('lists My projects by name with their initial, from your projects and today\'s plan, each with its count on today\'s plan', async () => {
        const engine = { id: 'p2', name: 'Escalation Engine', color: '#b06ae0' };
        renderSidebar({
            projects: [project('p1', 'Unified Inbox'), project('p2', 'Escalation Engine', '#b06ae0')],
            items: [planned('a', engine), planned('b', engine), planned('c', { id: 'p3', name: 'SLA & Metrics', color: '#3a9a68' }), planned('d', null)],
        });

        const nav = within(await screen.findByRole('navigation', { name: 'My projects' }));
        await waitFor(() => expect(nav.getAllByRole('link')).toHaveLength(3));
        const links = nav.getAllByRole('link');
        expect(links.map((l) => l.getAttribute('href'))).toEqual(['/projects/p2', '/projects/p3', '/projects/p1']);
        expect(links[0]).toHaveTextContent('Escalation Engine2 on today’s plan');
        expect(links[1]).toHaveTextContent('SLA & Metrics1 on today’s plan');
        expect(links[2]).toHaveTextContent(/^UUnified Inbox$/);
        const badge = links[0].querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(badge).toHaveTextContent('E');
        expect(badge.style.borderRadius).toBe('7px');
        expect(badge.style.background).toBe('rgb(176, 106, 224)');
        expect(within(links[0]).getByTitle('On today’s plan')).toHaveTextContent('2');
        expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/projects?filter[mine]=true&filter[status]=planning,in_progress,paused'))).toBe(true);
    });

    it('leaves My projects out when you have none', async () => {
        renderSidebar();
        await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/projects'))).toBe(true));
        await screen.findByText('Alex Rivera');
        expect(screen.queryByRole('navigation', { name: 'My projects' })).toBeNull();
        expect(screen.queryByText('My projects')).toBeNull();
    });

    it('ends with you and your team, your account menu, and a round theme toggle', async () => {
        const user = userEvent.setup();
        renderSidebar();
        expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
        expect(await screen.findByText('Platform team')).toBeInTheDocument();

        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();

        const theme = screen.getByRole('button', { name: /switch to/i });
        expect(theme.style.borderRadius).toBe('50%');
        expect(theme.style.borderStyle).toBe('solid');
        expect(theme.className).toContain('border-border2');
    });
});
