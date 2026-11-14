import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSidebar } from './GlobalSidebar';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
let projects: Array<{ id: string; name: string; color: string }> = [];
let unread = 0;
let issues: Array<{ id: string; status: string; assignee_id: string | null }> = [];
function renderSidebar(adminLevel = 'owner', isAgent = false, helpdeskEnabled = true, path = '/') {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/members')) return j({ data: [] });
        // The Today count reads /me/plan, which also contains '/me'.
        if (url.includes('/me/plan')) return j({ data: { capacity_minutes: 360, items: [], done_today: [] } });
        if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex', email: 'a@e.com', admin_level: adminLevel, is_developer: true, is_agent: isAgent, email_digest_frequency: 'off', workspace: { helpdesk_enabled: helpdeskEnabled } } });
        if (url.includes('/unread-count')) return j({ data: { count: unread } });
        if (url.includes('/teams')) return j({ data: [{ id: 't1', name: 'Smoke Team', identifier: 'SMK', color: '#6d69f2', member_count: 3, created_at: '', updated_at: '' }], links: { next: null } });
        if (url.includes('/projects')) return j({ data: projects, links: { next: null } });
        if (url.includes('/issues')) return j({ data: issues, links: { next: null } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);
}

describe('GlobalSidebar', () => {
    beforeEach(() => { projects = []; unread = 0; issues = []; try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());

    const yourWork = async () => within(await screen.findByRole('navigation', { name: 'Your work' }));
    const workspace = async () => within(await screen.findByRole('navigation', { name: 'Workspace' }));

    it('lists your work in the mockup\'s order: Today, Inbox, My issues, My teams, My projects, Escalations', async () => {
        projects = [{ id: 'p1', name: 'Unified Inbox', color: '#5b8def' }];
        renderSidebar();
        const nav = await yourWork();
        await nav.findByRole('button', { name: 'My projects' });
        await nav.findByRole('link', { name: 'Escalations' });
        const order = ['Today', 'Inbox', 'My issues', 'My teams', 'My projects', 'Escalations'].map((label) =>
            nav.getByRole(label === 'My teams' || label === 'My projects' ? 'button' : 'link', { name: new RegExp(`^${label}`) }));
        for (let i = 1; i < order.length; i++) {
            expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
        expect(screen.queryByText('Support bridge')).toBeNull();
    });
    it('draws a line icon on every row, at the mockup\'s 15px', async () => {
        renderSidebar('owner', true);
        const nav = await yourWork();
        await nav.findByRole('link', { name: 'Escalations' });
        const rows = [
            ...nav.getAllByRole('link').filter((l) => l.getAttribute('aria-label') !== 'New team'),
            nav.getByRole('button', { name: 'My teams' }),
            ...(await workspace()).getAllByRole('link'),
            ...within(screen.getByRole('navigation', { name: 'Support' })).getAllByRole('link'),
        ];
        expect(rows.length).toBeGreaterThanOrEqual(12);
        for (const row of rows) {
            expect(row.style.fontSize).toBe('15px');
            const icon = row.querySelector('svg') as SVGElement;
            expect(icon, row.textContent ?? '').not.toBeNull();
            expect(icon.getAttribute('width')).toBe('16');
            expect(icon.getAttribute('stroke')).toBe('currentColor');
            expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true');
        }
    });
    it('renders the Workspace group as a button that keeps its colour in classes', async () => {
        renderSidebar();
        const wsBtn = await screen.findByRole('button', { name: /Workspace/ });
        expect(wsBtn.style.color).toBe('');
        expect(wsBtn.className).toContain('hover:text-fg2');
        expect(wsBtn.style.fontSize).toBe('12.5px');
        expect(wsBtn.style.textTransform).toBe('');
    });
    it('Inbox links to the notifications, with the unread count in red', async () => {
        unread = 4;
        renderSidebar();
        const inbox = await screen.findByRole('link', { name: 'Inbox, 4 unread' });
        expect(inbox).toHaveAttribute('href', '/notifications');
        const badge = within(inbox).getByTestId('inbox-badge');
        expect(badge.textContent).toBe('4');
        expect(badge.style.background).toBe('var(--red)');
        expect(badge.style.color).toBe('var(--on-accent)');
    });
    it('Inbox shows no count when everything is read', async () => {
        renderSidebar();
        expect(await screen.findByRole('link', { name: 'Inbox' })).toHaveTextContent(/^Inbox$/);
        expect(screen.queryByTestId('inbox-badge')).toBeNull();
    });
    it('My issues links to the issue list filtered to me', async () => {
        renderSidebar();
        // The link is present immediately (falls back to "/issues" until `me` resolves), so wait for the
        // href itself rather than just the element to avoid asserting on the pre-fetch fallback.
        await waitFor(() => expect(screen.getByRole('link', { name: /My issues/ })).toHaveAttribute('href', '/issues?assignee_id=u1'));
    });
    it('My issues shows how many issues are yours, on a panel pill', async () => {
        issues = [{ id: 'i1', status: 'todo', assignee_id: 'u1' }, { id: 'i2', status: 'todo', assignee_id: 'u1' }, { id: 'i3', status: 'todo', assignee_id: 'u2' }];
        renderSidebar();
        const count = await screen.findByTestId('my-issues-count');
        expect(count.textContent).toBe('2');
        expect(count.style.background).toBe('var(--panel)');
        expect(screen.getByRole('link', { name: /My issues/ })).toContainElement(count);
    });
    it('My issues shows no count while none are yours', async () => {
        issues = [{ id: 'i3', status: 'todo', assignee_id: 'u2' }];
        renderSidebar();
        await screen.findByRole('button', { name: /Smoke Team/ }); // the lists have loaded
        expect(screen.queryByTestId('my-issues-count')).toBeNull();
    });
    it('Issues opens the issue list at /issues (/ is Today)', async () => {
        renderSidebar();
        expect((await workspace()).getByRole('link', { name: 'Issues' })).toHaveAttribute('href', '/issues');
    });
    it('lists Issues, Projects and Roadmap in the Workspace section, with no Cycles row (cycles are reached from a team)', async () => {
        renderSidebar();
        const nav = await workspace();
        expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['Issues', 'Projects', 'Roadmap', 'Analytics', 'Releases']);
        expect(nav.queryByRole('link', { name: 'Cycles' })).toBeNull();
    });
    it('shows no counts on Issues, Projects or a team, and asks for no project list or escalated issues to count', async () => {
        issues = [{ id: 'i1', status: 'todo', assignee_id: null }];
        projects = [{ id: 'p1', name: 'Unified Inbox', color: '#5b8def' }];
        renderSidebar();
        const nav = await workspace();
        const team = await screen.findByRole('button', { name: /Smoke Team/ });
        await screen.findByRole('link', { name: 'Unified Inbox' });
        expect(nav.getByRole('link', { name: 'Issues' })).toHaveTextContent(/^Issues$/);
        expect(nav.getByRole('link', { name: 'Projects' })).toHaveTextContent(/^Projects$/);
        expect(team).toHaveTextContent(/^Smoke Team▶$/);
        expect(screen.queryByTestId('projects-count')).toBeNull();
        expect(screen.queryByTestId('escalations-badge')).toBeNull();
        const calls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
        expect(calls.filter((u) => u.includes('escalated'))).toEqual([]);
        expect(calls.filter((u) => u.includes('/projects') && !u.includes('filter[mine]=true'))).toEqual([]);
    });
    it('Escalations opens the issues that came from Support, with no count', async () => {
        renderSidebar();
        const link = await screen.findByRole('link', { name: 'Escalations' });
        expect(link).toHaveAttribute('href', '/issues?escalated=true');
        expect(link).not.toHaveAttribute('aria-current');
        expect(link).toHaveTextContent(/^Escalations$/);
    });
    it('Escalations is the current row, in the text colour, on the escalated list or board; Issues is not', async () => {
        renderSidebar('owner', false, true, '/issues?escalated=true');
        const link = await screen.findByRole('link', { name: 'Escalations' });
        expect(link).toHaveAttribute('aria-current', 'page');
        expect(link.style.fontWeight).toBe('700');
        expect(link.style.background).toBe('var(--panel)');
        expect(link.style.color).toBe('');
        expect(link.className).toContain('text-fg');
        expect(link.className).not.toContain('text-fg2');
        const issuesRow = (await workspace()).getByRole('link', { name: 'Issues' });
        expect(issuesRow).not.toHaveAttribute('aria-current');
        expect(issuesRow.style.fontWeight).not.toBe('700');
    });
    it('Issues is the current row on the plain issue list, and Escalations is not', async () => {
        renderSidebar('owner', false, true, '/issues?status=todo');
        const issuesRow = (await workspace()).getByRole('link', { name: 'Issues' });
        expect(issuesRow).toHaveAttribute('aria-current', 'page');
        expect(issuesRow.style.fontWeight).toBe('700');
        expect(await screen.findByRole('link', { name: 'Escalations' })).not.toHaveAttribute('aria-current');
    });
    it('hides Escalations when the workspace has no support desk', async () => {
        renderSidebar('owner', false, false);
        await screen.findByRole('link', { name: /My issues/ });
        expect(screen.queryByRole('link', { name: /Escalations/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Escalations/ })).toBeNull();
    });
    it('My issues is the current row while the list is filtered to your own issues, and Issues is not', async () => {
        renderSidebar('owner', false, true, '/issues?assignee_id=u1');
        const mine = await screen.findByRole('link', { name: /My issues/ });
        await waitFor(() => expect(mine).toHaveAttribute('aria-current', 'page'));
        expect(mine.style.fontWeight).toBe('700');
        const issuesRow = (await workspace()).getByRole('link', { name: 'Issues' });
        expect(issuesRow).not.toHaveAttribute('aria-current');
        expect(issuesRow.style.fontWeight).not.toBe('700');
    });
    it('My issues is not current on the plain list or on someone else\'s issues', async () => {
        renderSidebar('owner', false, true, '/issues?assignee_id=u2');
        const mine = await screen.findByRole('link', { name: /My issues/ });
        await waitFor(() => expect(mine).toHaveAttribute('href', '/issues?assignee_id=u1'));
        expect(mine).not.toHaveAttribute('aria-current');
        expect((await workspace()).getByRole('link', { name: 'Issues' })).toHaveAttribute('aria-current', 'page');
    });
    it('My teams is open with each team closed; a team opens to its own Issues, Cycles and Projects', async () => {
        const user = userEvent.setup();
        renderSidebar();
        const myTeams = await screen.findByRole('button', { name: 'My teams' });
        expect(myTeams).toHaveAttribute('aria-expanded', 'true');
        const team = await screen.findByRole('button', { name: /Smoke Team/ });
        expect(team).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByTestId('team-links-t1')).toBeNull();
        const square = team.querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(square.style.width).toBe('20px');
        expect(square.style.borderRadius).toBe('6px');
        expect(square.style.background).toBe('rgb(109, 105, 242)');

        await user.click(team);
        expect(team).toHaveAttribute('aria-expanded', 'true');
        const teamLinks = within(screen.getByTestId('team-links-t1'));
        expect(teamLinks.getAllByRole('link').map((l) => l.textContent)).toEqual(['Issues', 'Cycles', 'Projects']);
        expect(teamLinks.getByRole('link', { name: 'Issues' })).toHaveAttribute('href', '/issues?team_id=t1');
        expect(teamLinks.getByRole('link', { name: 'Cycles' })).toHaveAttribute('href', '/teams/t1/cycles');
        expect(teamLinks.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects?team_id=t1');
    });
    it('My teams folds away, and stays folded on the next visit', async () => {
        const user = userEvent.setup();
        const first = renderSidebar();
        await screen.findByRole('button', { name: /Smoke Team/ });
        await user.click(screen.getByRole('button', { name: 'My teams' }));
        expect(screen.queryByRole('button', { name: /Smoke Team/ })).toBeNull();
        first.unmount();

        renderSidebar();
        expect(await screen.findByRole('button', { name: 'My teams' })).toHaveAttribute('aria-expanded', 'false');
        await screen.findByRole('link', { name: 'Escalations' });
        expect(screen.queryByRole('button', { name: /Smoke Team/ })).toBeNull();
    });
    it('My projects lists your projects by name, each a colour square and a link to the project; it folds away', async () => {
        const user = userEvent.setup();
        projects = [{ id: 'p1', name: 'Unified Inbox', color: '#5b8def' }, { id: 'p2', name: 'Escalation Engine', color: '#b06ae0' }];
        renderSidebar();
        const toggle = await screen.findByRole('button', { name: 'My projects' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const list = within(screen.getByRole('group', { name: 'My projects' }));
        const links = list.getAllByRole('link');
        expect(links.map((l) => l.textContent)).toEqual(['Escalation Engine', 'Unified Inbox']);
        expect(links.map((l) => l.getAttribute('href'))).toEqual(['/projects/p2', '/projects/p1']);
        const square = links[0].querySelector('[aria-hidden="true"]') as HTMLElement;
        expect(square.style.width).toBe('20px');
        expect(square.style.borderRadius).toBe('6px');
        expect(square.style.background).toBe('rgb(176, 106, 224)');
        expect(vi.mocked(fetch).mock.calls.some((c) => String(c[0]).includes('/projects?filter[mine]=true'))).toBe(true);

        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('group', { name: 'My projects' })).toBeNull();
    });
    it('leaves My projects out when you have none', async () => {
        renderSidebar();
        await screen.findByRole('button', { name: /Smoke Team/ });
        await waitFor(() => expect(vi.mocked(fetch).mock.calls.some((c) => String(c[0]).includes('/projects'))).toBe(true));
        expect(screen.queryByRole('button', { name: 'My projects' })).toBeNull();
    });
    it('collapses the Workspace section', async () => {
        const user = userEvent.setup();
        renderSidebar();
        await workspace();
        await user.click(screen.getByRole('button', { name: 'Workspace' }));
        expect(screen.queryByRole('link', { name: 'Projects' })).toBeNull();
        expect(screen.queryByRole('navigation', { name: 'Workspace' })).toBeNull();
    });
    it('shows the + New team control only for owner/admin', async () => {
        renderSidebar('member');
        await screen.findByRole('button', { name: 'My teams' });
        await screen.findByRole('button', { name: /Smoke Team/ });
        expect(screen.queryByRole('link', { name: 'New team' })).toBeNull();
    });
    it('the + New team link sits beside My teams, a 26×26 target', async () => {
        renderSidebar();
        const link = await screen.findByRole('link', { name: 'New team' });
        expect(link).toHaveAttribute('href', '/settings/teams');
        expect(link.style.width).toBe('26px');
        expect(link.style.height).toBe('26px');
        expect(link.parentElement).toContainElement(screen.getByRole('button', { name: 'My teams' }));
    });
    it('hides the desk rows for non-agents', async () => {
        renderSidebar('owner', false);
        await screen.findByRole('link', { name: 'Escalations' });
        expect(screen.queryByRole('navigation', { name: 'Support' })).toBeNull();
        expect(screen.queryByRole('link', { name: /Support inbox/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Knowledge base/ })).toBeNull();
    });
    it('puts Support inbox, Knowledge base and Help center last for agents, with no "Agent" tag', async () => {
        renderSidebar('member', true);
        const nav = within(await screen.findByRole('navigation', { name: 'Support' }));
        expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['Support inbox', 'Knowledge base', 'Help centerPublic']);
        expect(nav.getByRole('link', { name: 'Support inbox' })).toHaveAttribute('href', '/support');
        expect(nav.getByRole('link', { name: 'Knowledge base' })).toHaveAttribute('href', '/support/kb');
        expect(nav.getByRole('link', { name: /Help center/ })).toHaveAttribute('href', '/help');
        const ws = screen.getByRole('navigation', { name: 'Workspace' });
        expect(ws.compareDocumentPosition(screen.getByRole('navigation', { name: 'Support' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    it('hides the tracker nav + New issue for an agent-only non-developer', async () => {
        // agent-only: admin_level member, is_developer false, is_agent true
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/members')) return j({ data: [] });
            if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Maya', email: 'm@e.com', admin_level: 'member', is_developer: false, is_agent: true, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } } });
            if (url.includes('/unread-count')) return j({ data: { count: 0 } });
            if (url.includes('/teams')) return j({ data: [], links: { next: null } });
            if (url.includes('/issues')) return j({ data: [], links: { next: null } });
            return j({ data: {} });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);
        // Support inbox is gated on `me.data?.is_agent` (async-resolved): `findByRole` polls until /me resolves.
        expect(await screen.findByRole('link', { name: /Support inbox/ })).toBeInTheDocument();
        // tracker surfaces gone:
        expect(screen.queryByText('Workspace')).toBeNull();
        expect(screen.queryByText('My teams')).toBeNull();
        expect(screen.queryByText('My projects')).toBeNull();
        expect(screen.queryByRole('button', { name: /New issue/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /My issues/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Escalations/ })).toBeNull();
        // support surfaces kept:
        expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
    });
    it('shows the tracker nav + New issue for a developer', async () => {
        renderSidebar('member', false); // is_developer:true in the stub
        expect(await screen.findByText('Workspace')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /New issue/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /My issues/ })).toBeInTheDocument();
    });
    it('hides every desk row when the workspace has the helpdesk switched off', async () => {
        renderSidebar('owner', true, false);
        // The desk rows resolve with /me, so assert only after something else that
        // /me gates has committed — otherwise this passes on the loading render.
        expect(await screen.findByText('Workspace')).toBeInTheDocument();
        // Inbox stays: it is notifications, not support.
        expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Support inbox/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Knowledge base/ })).toBeNull();
        expect(screen.queryByRole('link', { name: /Help center/ })).toBeNull();
    });
    it('v2 shell: brand mark + display wordmark, ink New-issue pill', async () => {
        const { container } = renderSidebar();
        expect(await screen.findByText('Prizy')).toHaveStyle({ fontFamily: 'var(--font-display)' });
        expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('P');
        const newIssue = await screen.findByRole('button', { name: /New issue/ });
        expect(newIssue.style.borderRadius).toBe('var(--radius-pill)');
        expect(newIssue.style.background).toBe('');           // colours are classes so hover can fire
        expect(newIssue.className).toContain('bg-fg');
        expect(newIssue.className).toContain('hover:bg-accent');
    });
    it('inactive nav rows have no inline colour or background so the hover classes fire; the active row is a panel card', async () => {
        renderSidebar('owner', false, true, '/issues');
        const nav = await workspace();
        const issuesRow = nav.getByRole('link', { name: 'Issues' }) as HTMLElement; // MemoryRouter is at "/issues" → active
        expect(issuesRow.style.background).toBe('var(--panel)');
        expect(issuesRow.style.fontWeight).toBe('700');
        // G3b: the current row's ring stays 3:1 against the bar.
        expect(issuesRow.style.boxShadow).toBe('0 0 0 1.5px var(--field)');
        const projectsRow = nav.getByRole('link', { name: 'Projects' }) as HTMLElement;
        expect(projectsRow.style.background).toBe('');
        expect(projectsRow.style.color).toBe('');
        expect(projectsRow.className).toContain('hover:bg-hover');
        expect(projectsRow.className).toContain('hover:text-fg');
    });
});

describe('P7-B: the Today entry', () => {
    beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());

    it('comes first in the sidebar, before My issues, and links to /today', async () => {
        renderSidebar();
        const today = await screen.findByRole('link', { name: /Today/ });
        expect(today).toHaveAttribute('href', '/today');
        expect(screen.getAllByRole('link')[0]).toBe(today);
        const myIssues = screen.getByRole('link', { name: /My issues/ });
        expect(today.compareDocumentPosition(myIssues) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is only for tracker users', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex', email: 'a@e.com', admin_level: 'member', is_developer: false, is_agent: true, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } } });
            if (url.includes('/unread-count')) return j({ data: { count: 0 } });
            return j({ data: [], links: { next: null } });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);

        expect(await screen.findByRole('link', { name: /Support inbox/ })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Today/ })).toBeNull();
    });
});

describe('Today v2: the Today count', () => {
    beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());

    function renderWithPlan(open: number, isDeveloper = true) {
        const fetchMock = vi.fn(async (url: string) => {
            if (url.includes('/me/plan')) {
                const items = Array.from({ length: open }, (_, i) => ({ issue: { id: `i${i}`, identifier: `PRZ-I${i}`, title: `Issue ${i}`, status: 'todo', priority: 'medium', estimate: null, project: null }, minutes: 60, position: i, tag: null, reason: null, can_undo: false }));
                return j({ data: { capacity_minutes: 360, items, done_today: [] } });
            }
            if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex', email: 'a@e.com', admin_level: 'member', is_developer: isDeveloper, is_agent: !isDeveloper, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true } } });
            if (url.includes('/unread-count')) return j({ data: { count: 0 } });
            return j({ data: [], links: { next: null } });
        });
        vi.stubGlobal('fetch', fetchMock);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);
        return fetchMock;
    }

    it('shows the open plan count on the Today row', async () => {
        renderWithPlan(3);

        expect(await screen.findByTestId('today-badge')).toHaveTextContent('3');
        expect(screen.getByRole('link', { name: /Today/ })).toContainElement(screen.getByTestId('today-badge'));
        expect(screen.getByTestId('today-badge')).toHaveAccessibleName('3 planned');
    });

    it('hides the count when nothing is planned', async () => {
        const fetchMock = renderWithPlan(0);

        await screen.findByRole('link', { name: /Today/ });
        await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/me/plan'))).toBe(true));
        await new Promise((r) => setTimeout(r, 0));
        expect(screen.queryByTestId('today-badge')).toBeNull();
    });

    it('never asks for a plan for a user without the tracker', async () => {
        const fetchMock = renderWithPlan(2, false);

        await screen.findByRole('link', { name: /Support inbox/ });
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/me/plan'))).toBe(false);
    });
});

describe('a workspace with the tracker switched off', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('offers the desk alone, and asks for nothing of the tracker — the owner included', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex', email: 'a@e.com', admin_level: 'owner', is_developer: true, is_agent: true, email_digest_frequency: 'off', workspace: { helpdesk_enabled: true, tracker_enabled: false } } });
            return j({ data: [], links: { next: null } });
        });
        vi.stubGlobal('fetch', fetchMock);
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><GlobalSidebar onCollapse={() => {}} /></MemoryRouter></QueryClientProvider>);

        // The desk rows resolve with /me: anchor on one before asserting what is absent.
        expect(await screen.findByRole('link', { name: /Support inbox/ })).toHaveAttribute('href', '/support');
        expect(screen.queryByRole('link', { name: /Today/ })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Inbox' })).toBeNull();
        expect(screen.queryByRole('link', { name: /My issues/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Workspace' })).toBeNull();
        expect(screen.queryByText('My teams')).toBeNull();
        expect(screen.queryByText('My projects')).toBeNull();
        expect(screen.queryByRole('button', { name: /New issue/ })).toBeNull();
        const asked = fetchMock.mock.calls.map(([url]) => String(url));
        expect(asked.filter((u) => /\/(issues|teams|projects|unread-count|me\/plan)/.test(u))).toEqual([]);
    });
});
