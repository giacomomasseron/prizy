import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupByStatus, LIST_GROUP_ORDER, starredGroup } from './hooks';
import type { Issue, IssueStatus } from '../../lib/types';
import IssueListPage from './IssueListPage';

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Unit tests for groupByStatus and LIST_GROUP_ORDER
// ---------------------------------------------------------------------------

function makeIssue(id: string, status: IssueStatus): Issue {
    return { id, status, title: `T`, description: null, priority: 'no_priority',
        estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: null,
        cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1',
        archived_at: null, labels: [],
        created_at: '2026-07-04T00:00:00.000000Z', updated_at: '2026-07-04T00:00:00.000000Z' };
}

describe('LIST_GROUP_ORDER', () => {
    it('starts with in_progress, in_review', () => {
        expect(LIST_GROUP_ORDER[0]).toBe('in_progress');
        expect(LIST_GROUP_ORDER[1]).toBe('in_review');
    });
    it('has exactly 6 statuses (includes cancelled)', () => {
        expect(LIST_GROUP_ORDER).toHaveLength(6);
        expect(LIST_GROUP_ORDER).toContain('cancelled');
    });
});

describe('groupByStatus + visibility', () => {
    it('groups and counts correctly', () => {
        const issues = [makeIssue('1', 'todo'), makeIssue('2', 'in_progress'), makeIssue('3', 'todo')];
        const g = groupByStatus(issues);
        expect(g.todo).toHaveLength(2);
        expect(g.in_progress).toHaveLength(1);
        expect(g.cancelled).toHaveLength(0);
    });

    it('empty groups are excluded from visible groups', () => {
        const g = groupByStatus([makeIssue('1', 'done')]);
        const visible = LIST_GROUP_ORDER.filter((s) => g[s].length > 0);
        expect(visible).toEqual(['done']);
    });

    it('multiple non-empty groups appear in LIST_GROUP_ORDER sequence', () => {
        const issues = [makeIssue('1', 'todo'), makeIssue('2', 'in_progress'), makeIssue('3', 'backlog')];
        const g = groupByStatus(issues);
        const visible = LIST_GROUP_ORDER.filter((s) => g[s].length > 0);
        expect(visible).toEqual(['in_progress', 'todo', 'backlog']);
    });
});

// ---------------------------------------------------------------------------
// Integration test for IssueListPage component
// ---------------------------------------------------------------------------

it('renders issue titles from the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
        const page = (items: unknown[]) => ({ data: items, links: { next: null, prev: null }, meta: { per_page: 25 } });
        const envelope = (data: unknown) => ({ data });
        let body: unknown;
        if (url.includes('/v1/me') || url.includes('/me')) {
            body = envelope({ id: 'u1', is_developer: false, admin_level: 'member' });
        } else if (url.includes('/v1/saved-views') || url.includes('/saved-views')) {
            body = page([]);
        } else if (url.includes('/v1/teams') || url.includes('/teams')) {
            body = page([]);
        } else if (url.includes('/v1/projects') || url.includes('/projects')) {
            body = page([]);
        } else if (url.includes('/v1/labels') || url.includes('/labels')) {
            body = page([]);
        } else {
            body = page([{ id: 'i1', title: 'Build login', status: 'todo', priority: 'high', assignee_id: null, labels: [] }]);
        }
        return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body });
    }));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><IssueListPage /></MemoryRouter>
        </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Build login')).toBeInTheDocument());
});

// ---------------------------------------------------------------------------
// v2 states: group cards, empty messages, request failure
// ---------------------------------------------------------------------------

describe('IssueListPage v2 states', () => {
    const page = (items: unknown[]) => ({ data: items, links: { next: null, prev: null }, meta: { per_page: 25 } });
    type Res = { ok: boolean; status: number; body: unknown };

    function stub(issues: Res) {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            let res: Res = { ok: true, status: 200, body: page([]) };
            if (url.includes('/me')) res = { ok: true, status: 200, body: { data: { id: 'u1', is_developer: false, admin_level: 'member' } } };
            else if (url.includes('/issues')) res = issues;
            return Promise.resolve({ ok: res.ok, status: res.status, headers: { get: () => 'application/json' }, json: async () => res.body });
        }));
    }
    function renderAt(path: string) {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={qc}>
                <MemoryRouter initialEntries={[path]}><IssueListPage /></MemoryRouter>
            </QueryClientProvider>,
        );
    }
    const empty: Res = { ok: true, status: 200, body: page([]) };

    it('says "No issues match these filters." when a filter is set and nothing comes back', async () => {
        stub(empty);
        renderAt('/?status=todo');
        expect(await screen.findByText('No issues match these filters.')).toBeInTheDocument();
        expect(screen.queryByText('No issues yet.')).toBeNull();
    });

    it('says "No issues yet." when no filter is set (sort alone is not a filter)', async () => {
        stub(empty);
        renderAt('/?sort=title');
        expect(await screen.findByText('No issues yet.')).toBeInTheDocument();
    });

    it('shows neither empty message when the request fails', async () => {
        stub({ ok: false, status: 500, body: { title: 'Error', detail: 'boom' } });
        renderAt('/');
        await waitFor(() => expect(screen.queryByText('Loading…')).toBeNull());
        expect(screen.queryByText('No issues yet.')).toBeNull();
        expect(screen.queryByText('No issues match these filters.')).toBeNull();
    });

    it('renders each status group as a card with a round "+" button', async () => {
        stub({ ok: true, status: 200, body: page([{ id: 'i1', title: 'Build login', status: 'todo', priority: 'high', assignee_id: null, labels: [], updated_at: '2026-07-04T00:00:00Z' }]) });
        renderAt('/');
        await screen.findByText('Build login');
        expect(screen.getByRole('button', { name: 'Create Todo issue' }).style.borderRadius).toBe('50%');
        const card = screen.getByTestId('issue-row').parentElement as HTMLElement;
        expect(card.style.borderRadius).toBe('var(--radius-card)');
        expect(card.style.overflow).toBe('hidden');
    });
});

// ---------------------------------------------------------------------------
// P7-A: the Starred group (PRD §3.2.9)
// ---------------------------------------------------------------------------

describe('P7-A: starredGroup', () => {
    const at = (iso: string | null, starred = true) => ({ starred, starred_at: iso });

    it('merges the starred request with the list\'s just-starred issues, once each, newest star first', () => {
        const server = [{ ...makeIssue('a', 'todo'), ...at('2026-10-10T10:00:00Z') }];
        const list = [
            { ...makeIssue('a', 'todo'), ...at('2026-10-10T10:00:00Z') },
            { ...makeIssue('b', 'done'), ...at('2026-10-10T11:00:00Z') }, // just starred (optimistic)
            { ...makeIssue('c', 'todo'), ...at(null, false) },
        ];
        expect(starredGroup(server, list).map((i) => i.id)).toEqual(['b', 'a']);
    });

    it('drops an issue just unstarred, even though the starred request still holds it', () => {
        const server = [{ ...makeIssue('a', 'todo'), ...at(null, false) }]; // flipped by the optimistic update
        expect(starredGroup(server, [])).toEqual([]);
    });
});

describe('P7-A: the Starred group on the list', () => {
    const page = (items: unknown[]) => ({ data: items, links: { next: null, prev: null }, meta: { per_page: 25 } });
    const row = (id: string, title: string, status: string, starredAt: string | null) => ({
        id, title, status, priority: 'medium', assignee_id: null, labels: [], updated_at: '2026-07-04T00:00:00Z',
        starred: starredAt !== null, starred_at: starredAt,
    });

    function stub(list: unknown[], starred: unknown[]) {
        const urls: string[] = [];
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            urls.push(decodeURIComponent(url));
            let body: unknown = page([]);
            if (url.includes('/me')) body = { data: { id: 'u1', is_developer: true, admin_level: 'member' } };
            else if (url.includes('/issues')) body = decodeURIComponent(url).includes('filter[starred]=true') ? page(starred) : page(list);
            return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body });
        }));
        return urls;
    }
    function renderAt(path: string) {
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={qc}>
                <MemoryRouter initialEntries={[path]}><IssueListPage /></MemoryRouter>
            </QueryClientProvider>,
        );
    }

    it('pins the starred issues above the status groups, newest star first, and never repeats them under their status', async () => {
        const older = row('a', 'Older star', 'todo', '2026-10-10T10:00:00Z');
        const newer = row('c', 'Newer star', 'done', '2026-10-10T11:00:00Z');
        stub([older, row('b', 'Plain todo', 'todo', null), newer], [older, newer]);
        renderAt('/');

        const group = await screen.findByTestId('starred-group');
        expect(within(group).getByText('Starred')).toBeInTheDocument();
        expect(within(group).getByText('2')).toBeInTheDocument();
        const titles = within(group).getAllByTestId('issue-row').map((r) => within(r).getAllByRole('button')[1].textContent);
        expect(titles).toEqual(['Newer star', 'Older star']);

        // The group comes first; starred issues are not repeated under Todo / Done.
        const sections = document.querySelectorAll('section');
        expect(sections[0]).toBe(group);
        expect(screen.getAllByText('Older star')).toHaveLength(1);
        expect(screen.getAllByText('Newer star')).toHaveLength(1);
        expect(screen.getByText('Plain todo')).toBeInTheDocument();
    });

    it('is hidden when nothing is starred', async () => {
        stub([row('b', 'Plain todo', 'todo', null)], []);
        renderAt('/');
        await screen.findByText('Plain todo');
        expect(screen.queryByTestId('starred-group')).toBeNull();
    });

    it('follows the active filters: its own request carries them, and starred never counts as a filter', async () => {
        const urls = stub([], []);
        renderAt('/?status=todo');
        await waitFor(() => expect(urls.some((u) => u.includes('filter[starred]=true'))).toBe(true));
        const starredUrl = urls.find((u) => u.includes('filter[starred]=true'))!;
        expect(starredUrl).toContain('filter[status]=todo');
        expect(urls.filter((u) => u.includes('/issues') && !u.includes('filter[starred]')).every((u) => !u.includes('starred'))).toBe(true);
    });
});
