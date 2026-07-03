import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import IssueDetailPage from './IssueDetailPage';

afterEach(() => vi.restoreAllMocks());

it('renders the issue title and a comment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
        const page = (items: unknown[]) => ({ data: items, links: { next: null, prev: null }, meta: { per_page: 25 } });
        let body: unknown;
        if (url.includes('/comments')) {
            body = { data: [{ id: 'c1', issue_id: 'i1', user_id: 'u', body: 'Nice', is_internal: false, edited_at: null, created_at: '', updated_at: '' }], links: { next: null, prev: null }, meta: { per_page: 25 } };
        } else if (url.includes('/activities')) {
            body = page([]);
        } else if (url.includes('/issues/i1/labels')) {
            body = page([]);
        } else if (url.includes('/v1/labels') || url.includes('/labels')) {
            body = page([]);
        } else if (url.includes('/v1/projects') || url.includes('/projects')) {
            body = page([]);
        } else if (url.includes('/cycles')) {
            body = page([]);
        } else if (url.includes('/v1/teams') || url.includes('/teams')) {
            body = page([]);
        } else if (url.includes('/github-links')) {
            body = { data: [] };
        } else if (url.includes('/v1/me')) {
            body = { data: { id: 'u1', admin_level: 'owner', is_developer: true, is_agent: false, workspace_id: 'w', name: 'A', email: 'a@x.co' } };
        } else {
            body = { data: { id: 'i1', title: 'Detail me', status: 'todo', priority: 'low', description: null, assignee_id: null, archived_at: null, team_id: 't1', project_id: null, cycle_id: null } };
        }
        return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body });
    }));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={['/issues/i1']}>
                <Routes><Route path="/issues/:id" element={<IssueDetailPage />} /></Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Detail me')).toBeInTheDocument());
    expect(await screen.findByText('Nice')).toBeInTheDocument();
});
