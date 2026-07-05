import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from './SearchPage';

function wrap(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).includes('/search/issues')) {
            return new Response(JSON.stringify({ data: [
                { id: 'i1', title: 'Fix login bug', status: 'todo', priority: 'high', team_id: 't1', project_id: null, assignee_id: null, created_by: 'u', archived_at: null, created_at: '', updated_at: '', labels: [] },
            ], meta: { current_page: 1, last_page: 1 } }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }));
});

describe('SearchPage', () => {
    it('browses results on load (empty query) and highlights the query match', async () => {
        wrap(<SearchPage />);
        expect(await screen.findByText('Fix login bug')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/search/i), { target: { value: 'login' } });
        // highlighted fragment carries the accent style / a mark testid
        expect(await screen.findByTestId('hl')).toHaveTextContent('login');
    });

    it('shows the empty state when there are no results', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1 } }), { status: 200 })));
        wrap(<SearchPage />);
        expect(await screen.findByText(/No issues match/i)).toBeInTheDocument();
    });
});
