import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import IssueListPage from './IssueListPage';

afterEach(() => vi.restoreAllMocks());

it('renders issue titles from the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [{ id: 'i1', title: 'Build login', status: 'todo', priority: 'high', assignee_id: null }], links: { next: null, prev: null }, meta: { per_page: 25 } }),
    }));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><IssueListPage /></MemoryRouter>
        </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Build login')).toBeInTheDocument());
});
