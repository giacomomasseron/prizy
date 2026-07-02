import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IssueDetailPage from './IssueDetailPage';

const issue = { id: 'i1', title: 'Fix', description: null, status: 'todo', priority: 'medium', team_id: 't1', project_id: null, cycle_id: null, assignee_id: null, created_by: 'u1', estimate: null, due_date: null, sort_order: 1, parent_issue_id: null, archived_at: null, created_at: '', updated_at: '' };

describe('IssueDetailPage labels', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes(`/issues/i1/labels`)) {
                if ((init?.method ?? 'GET') === 'PUT') return j({ data: [{ id: 'l1', name: 'Bug', color: '#f00', created_at: '', updated_at: '' }] });
                return j({ data: [], links: { next: null } });
            }
            if (url.includes('/v1/labels')) return j({ data: [{ id: 'l1', name: 'Bug', color: '#f00', created_at: '', updated_at: '' }], links: { next: null } });
            if (url.includes('/issues/i1/comments')) return j({ data: [], links: { next: null } });
            if (url.includes('/issues/i1/activities')) return j({ data: [], links: { next: null } });
            if (url.match(/\/issues\/i1$/)) return j({ data: issue });
            if (url.includes('/v1/projects')) return j({ data: [], links: { next: null } });
            if (url.includes('/cycles')) return j({ data: [], links: { next: null } });
            if (url.includes('/v1/me')) return j({ data: { id: 'u1', admin_level: 'owner', is_developer: true, is_agent: false, workspace_id: 'w', name: 'A', email: 'a@x.co' } });
            return j({ data: [], links: { next: null } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('sets a label via the multi-select', async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={['/issues/i1']}>
                    <Routes><Route path="/issues/:id" element={<IssueDetailPage />} /></Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        const checkbox = await screen.findByLabelText('Bug');
        await userEvent.click(checkbox);
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/issues/i1/labels') && i?.method === 'PUT')).toBe(true);
        });
    });
});
