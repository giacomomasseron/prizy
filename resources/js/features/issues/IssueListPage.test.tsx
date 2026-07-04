import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupByStatus, LIST_GROUP_ORDER } from './hooks';
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
