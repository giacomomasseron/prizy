import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilterBar } from './FilterBar';

const me = { id: 'u1', workspace_id: 'w', name: 'A', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false };

function Harness() {
    const [sp] = useSearchParams();
    return (<><FilterBar viewType="list" /><output data-testid="qs">{sp.toString()}</output></>);
}
function renderBar(initial = '/') {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[initial]}><Harness /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('FilterBar views', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (/\/v1\/me(\?|$)/.test(url)) return j({ data: me });
            if (url.includes('/v1/saved-views')) return j({ data: [], links: { next: null } });
            return j({ data: [], links: { next: null } });
        }));
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('applies the My Issues built-in (assignee_id = current user)', async () => {
        renderBar('/');
        await screen.findByRole('button', { name: 'Save view' });
        await userEvent.click(screen.getByRole('button', { name: 'Views' }));
        await userEvent.click(await screen.findByRole('menuitem', { name: 'My Issues' }));
        expect(screen.getByTestId('qs').textContent).toContain('assignee_id=u1');
    });

    it('saves the current filters as a view via inline input', async () => {
        renderBar('/?status=todo');
        await userEvent.click(await screen.findByRole('button', { name: 'Save view' }));
        const input = await screen.findByLabelText('View name');
        await userEvent.type(input, 'My view');
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/v1/saved-views') && i?.method === 'POST')).toBe(true);
        });
    });
});

// Workspace mockup (2026-11-11): Assignee is a filter field, a "Clear" link drops every filter, and the Views
// button names the view whose filters are on the page.
describe('FilterBar: Assignee field, Clear link, active view', () => {
    const members = [{ id: 'u1', name: 'Alex Rivera', is_agent: false }, { id: 'u2', name: 'Bea Costa', is_agent: false }];
    const savedView = (over: Record<string, unknown> = {}) => ({
        id: 'v1', name: 'Bugs by priority', created_by: 'u1', created_at: '', updated_at: '',
        definition: { filter: { status: 'todo' }, sort: 'priority', view_type: 'list', ...over },
    });
    let saved: unknown[] = [];

    beforeEach(() => {
        saved = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/members')) return j({ data: members });
            if (/\/v1\/me(\?|$)/.test(url)) return j({ data: me });
            if (url.includes('/v1/saved-views')) return j({ data: saved, links: { next: null } });
            return j({ data: [], links: { next: null } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('+ Filter lists the six fields of the mockup, Assignee last', async () => {
        renderBar('/');
        await userEvent.click(screen.getByRole('button', { name: '+ Filter' }));
        expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Status', 'Priority', 'Team', 'Project', 'Label', 'Assignee']);
    });

    it('picking a member under Assignee writes assignee_id to the URL', async () => {
        renderBar('/');
        await userEvent.click(screen.getByRole('button', { name: '+ Filter' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Assignee' }));
        await userEvent.click(await screen.findByLabelText('Bea Costa'));
        expect(screen.getByTestId('qs').textContent).toBe('assignee_id=u2');
    });

    it('an assignee filter is one editable pill named after the member, removable', async () => {
        renderBar('/?assignee_id=u1');
        expect(await screen.findByRole('button', { name: 'Assignee: Alex Rivera' })).toBeInTheDocument();
        expect(screen.queryByText('Assigned to me')).toBeNull();
        expect(screen.getAllByRole('button', { name: /^Remove .* filter$/ })).toHaveLength(1);
        await userEvent.click(screen.getByRole('button', { name: 'Remove Assignee filter' }));
        expect(screen.getByTestId('qs').textContent).toBe('');
    });

    it('Clear drops every filter and keeps the sort', async () => {
        renderBar('/?status=todo&priority=high&cycle_id=active&sort=priority');
        const clear = screen.getByRole('button', { name: 'Clear filters' });
        expect(clear.textContent).toBe('Clear');
        expect(clear.style.textDecoration).toBe('underline');
        await userEvent.click(clear);
        expect(screen.getByTestId('qs').textContent).toBe('sort=priority');
        expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    });

    it('there is no Clear link without a filter (a sort alone is not one)', () => {
        renderBar('/?sort=priority');
        expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    });

    it('the Views button reads "Views" when no view matches, and no row is marked', async () => {
        renderBar('/?status=todo');
        await screen.findByRole('button', { name: 'Save view' });
        const views = screen.getByRole('button', { name: 'Views' });
        expect(views.textContent).toBe('Views▾');
        await userEvent.click(views);
        expect(screen.getAllByRole('menuitem').filter((i) => i.getAttribute('aria-current'))).toEqual([]);
        expect(screen.getByRole('menu').textContent).not.toContain('✓');
    });

    it('names the built-in view whose filters are on the page and ticks its row', async () => {
        renderBar('/?assignee_id=u1');
        const views = await screen.findByRole('button', { name: 'Views: My Issues' });
        expect(views.textContent).toBe('My Issues▾');
        await userEvent.click(views);
        const row = screen.getByRole('menuitem', { name: 'My Issues' });
        expect(row).toHaveAttribute('aria-current', 'true');
        expect(row.textContent).toBe('✓My Issues');
        expect(row.style.fontWeight).toBe('700');
        const other = screen.getByRole('menuitem', { name: 'Backlog' });
        expect(other).not.toHaveAttribute('aria-current');
        expect(other.textContent).toBe('Backlog');
    });

    it('a built-in view stays named when only the sort changes', async () => {
        renderBar('/?status=backlog&sort=priority');
        expect(await screen.findByRole('button', { name: 'Views: Backlog' })).toBeInTheDocument();
    });

    it('a built-in view is not named once another filter is added', async () => {
        renderBar('/?status=backlog&priority=high');
        await screen.findByRole('button', { name: 'Save view' });
        expect(screen.getByRole('button', { name: 'Views' })).toBeInTheDocument();
    });

    it('picking the active built-in view again turns it off', async () => {
        renderBar('/?status=backlog');
        await userEvent.click(await screen.findByRole('button', { name: 'Views: Backlog' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Backlog' }));
        expect(screen.getByTestId('qs').textContent).toBe('');
        expect(screen.getByRole('button', { name: 'Views' })).toBeInTheDocument();
    });

    it('names a saved view when its filters and its sort are on the page', async () => {
        saved = [savedView()];
        renderBar('/?status=todo&sort=priority');
        await userEvent.click(await screen.findByRole('button', { name: 'Views: Bugs by priority' }));
        const row = screen.getByRole('menuitem', { name: 'Bugs by priority' });
        expect(row).toHaveAttribute('aria-current', 'true');
        expect(within(row).getByText('✓')).toBeInTheDocument();
    });

    it('a saved view is not named with another sort, or when it belongs to the board', async () => {
        saved = [savedView()];
        const first = renderBar('/?status=todo');
        await userEvent.click(screen.getByRole('button', { name: 'Views' }));
        expect(await screen.findByRole('menuitem', { name: 'Bugs by priority' })).not.toHaveAttribute('aria-current');
        first.unmount();

        saved = [savedView({ view_type: 'board' })];
        renderBar('/?status=todo&sort=priority');
        await userEvent.click(screen.getByRole('button', { name: 'Views' }));
        expect(await screen.findByRole('menuitem', { name: 'Bugs by priority' })).not.toHaveAttribute('aria-current');
    });
});
