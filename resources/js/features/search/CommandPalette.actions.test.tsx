import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPalette from './CommandPalette';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<any>()), useNavigate: () => navigate }));
const openCreate = vi.fn();
vi.mock('../issues/useIssueDrawers', () => ({ useIssueDrawers: () => ({ openCreate, openPeek: vi.fn(), close: vi.fn(), peekId: null, createOpen: false, createStatus: null }) }));
const themeState = vi.hoisted(() => ({ theme: 'light', toggle: null as unknown }));
vi.mock('../../lib/theme', async (orig) => ({ ...(await orig<any>()), useTheme: () => ({ theme: themeState.theme, toggle: themeState.toggle, setTheme: () => {} }) }));

interface World { me?: Record<string, unknown>; teams?: { id: string }[]; issues?: number }
const owner = { id: 'u1', admin_level: 'owner', is_developer: true, is_agent: false, workspace: { helpdesk_enabled: true, tracker_enabled: true } };

function stub({ me = owner, teams = [{ id: 't1' }, { id: 't2' }], issues = 8 }: World = {}) {
    const fetchMock = vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (/\/v1\/me(\?|$)/.test(url)) return j({ data: me });
        if (url.includes('/v1/search')) return j({ data: { issues: [{ id: 'found1', title: 'Payment webhook', status: 'todo' }], projects: [], teams: [] } });
        if (url.includes('/v1/teams')) return j({ data: teams, links: { next: null } });
        if (url.includes('/v1/issues')) return j({ data: Array.from({ length: issues }, (_, n) => ({ id: `issue${n}`, identifier: `PRZ-${n}`, title: `Issue number ${n}`, status: 'todo' })), links: { next: null } });
        return j({ data: {} });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}
async function openPalette(world: World = {}) {
    const fetchMock = stub(world);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={qc}><MemoryRouter><CommandPalette /></MemoryRouter></QueryClientProvider>);
    // `me` decides what is offered: wait for it before opening.
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => /\/v1\/me(\?|$)/.test(String(u)))).toBe(true));
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await screen.findByRole('combobox', { name: 'Search' });
    return fetchMock;
}
const options = () => screen.getAllByRole('option');
const option = (name: string) => options().find((o) => o.textContent?.includes(name))!;

beforeEach(() => { navigate.mockClear(); openCreate.mockClear(); themeState.theme = 'light'; themeState.toggle = vi.fn(); });
afterEach(() => vi.unstubAllGlobals());

describe('CommandPalette: actions', () => {
    it('asks for "a command or search"', async () => {
        await openPalette();
        expect(screen.getByRole('combobox', { name: 'Search' })).toHaveAttribute('placeholder', 'Type a command or search…');
    });

    it('lists the actions with a leading icon and no "Action" hint', async () => {
        await openPalette();
        await waitFor(() => expect(option('View escalations from Support')).toBeTruthy());
        const row = option('Go to Issues');
        const icon = within(row).getByTestId('command-icon');
        expect(icon.textContent).toBe('□');
        expect(icon.style.width).toBe('18px');
        expect(row.firstElementChild).toBe(icon);
        expect(row.textContent).toBe('□Go to Issues');
        expect(screen.queryByText('Action')).toBeNull();
    });

    it('Create new issue opens the composer and closes the palette, without going anywhere', async () => {
        await openPalette();
        await waitFor(() => expect(option('Create new issue')).toBeTruthy());
        await userEvent.click(option('Create new issue'));
        expect(openCreate).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull();
    });

    it('Toggle theme flips the theme and shows the theme it switches to', async () => {
        await openPalette();
        expect(within(option('Toggle theme')).getByTestId('command-icon').textContent).toBe('☾');
        await userEvent.click(option('Toggle theme'));
        expect(themeState.toggle).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('shows a sun on Toggle theme while the theme is dark', async () => {
        themeState.theme = 'dark';
        await openPalette();
        expect(within(option('Toggle theme')).getByTestId('command-icon').textContent).toBe('☀');
    });

    it('Go to Cycles opens the cycles of your first team', async () => {
        await openPalette();
        await waitFor(() => expect(option('Go to Cycles')).toBeTruthy());
        // The team list arrives after the palette opens.
        await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u).includes('/v1/teams?mine=1'))).toBe(true));
        await screen.findByText('Issue number 0');
        await userEvent.click(option('Go to Cycles'));
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/teams/t1/cycles');
    });

    it('Go to Cycles opens the team list when you are in no team', async () => {
        await openPalette({ teams: [] });
        await screen.findByText('Issue number 0');
        await userEvent.click(option('Go to Cycles'));
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/teams');
    });

    it('offers no escalations where the workspace has no support desk', async () => {
        await openPalette({ me: { ...owner, workspace: { helpdesk_enabled: false, tracker_enabled: true } } });
        await screen.findByText('Issue number 0');
        expect(option('View escalations from Support')).toBeUndefined();
        expect(option('Go to Issues')).toBeTruthy();
    });

    it('offers nothing that creates to a viewer', async () => {
        await openPalette({ me: { ...owner, admin_level: 'viewer' } });
        await screen.findByText('Issue number 0');
        expect(option('Create new issue')).toBeUndefined();
        expect(option('New project')).toBeUndefined();
        expect(option('New cycle')).toBeUndefined();
        expect(option('Go to Issues')).toBeTruthy();
    });

    it('keeps only settings and the theme where the tracker is off, and asks for no issues or teams', async () => {
        const fetchMock = await openPalette({ me: { ...owner, workspace: { helpdesk_enabled: true, tracker_enabled: false } } });
        expect(options().map((o) => o.textContent)).toEqual(['⚙Open workspace settings', '☾Toggle theme']);
        expect(fetchMock.mock.calls.filter(([u]) => /\/v1\/(issues|teams)/.test(String(u)))).toEqual([]);
        expect(screen.queryByTestId('palette-footer')).toBeNull();
    });
});

describe('CommandPalette: issues before anything is typed', () => {
    it('lists the first six issues under the actions, each opening its issue', async () => {
        await openPalette();
        await screen.findByText('Issue number 0');
        const issues = options().filter((o) => o.textContent?.includes('Issue number'));
        expect(issues.map((o) => o.textContent)).toEqual([0, 1, 2, 3, 4, 5].map((n) => `PRZ-${n}Issue number ${n}Issue`));
        expect(options().indexOf(issues[0])).toBeGreaterThan(options().indexOf(option('Toggle theme')));
        await userEvent.click(issues[2]);
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/issues/issue2');
    });

    it('replaces them with the search results once something is typed', async () => {
        await openPalette();
        await screen.findByText('Issue number 0');
        await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'pay');
        await screen.findByText('Payment webhook');
        expect(screen.queryByText('Issue number 0')).toBeNull();
    });

    it('does not ask for the issue list before the palette is opened', async () => {
        const fetchMock = stub();
        render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><CommandPalette /></MemoryRouter></QueryClientProvider>);
        await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => /\/v1\/me(\?|$)/.test(String(u)))).toBe(true));
        // Give `me` time to arrive: it is what would switch the two requests on.
        await new Promise((resolve) => setTimeout(resolve, 60));
        expect(fetchMock.mock.calls.filter(([u]) => /\/v1\/(issues|teams)/.test(String(u)))).toEqual([]);
    });
});

describe('CommandPalette: footer', () => {
    it('is a right-aligned "Advanced Search" link on the sunken ground that opens the search page', async () => {
        await openPalette();
        const footer = screen.getByTestId('palette-footer');
        expect(footer.style.justifyContent).toBe('flex-end');
        expect(footer.style.background).toBe('var(--bg2)');
        const link = within(footer).getByRole('button', { name: 'Advanced Search' });
        expect(link.textContent).toBe('⌕Advanced Search↗');
        expect(footer.textContent).not.toContain('filters, sort');
        await userEvent.click(link);
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/search');
    });

    it('carries what was typed to the search page', async () => {
        await openPalette();
        await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'web hook');
        await userEvent.click(within(screen.getByTestId('palette-footer')).getByRole('button', { name: 'Advanced Search' }));
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/search?q=web%20hook');
    });
});
