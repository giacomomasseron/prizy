import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SearchPage from './SearchPage';

function renderPage(initial = '/search?q=payment') {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[initial]}><SearchPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/teams')) {
            return j({ data: [], links: { next: null } });
        }
        const done = url.includes('filter%5Bstatus%5D=done') || url.includes('filter[status]=done');
        return j({ data: done ? [] : [{ id: 'i1', title: 'Payment webhook', status: 'todo' }], meta: { current_page: 1, last_page: 1 }, links: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

it('renders results for the q param', async () => {
    renderPage();
    expect(await screen.findByText('Payment webhook')).toBeInTheDocument();
});

it('refetches when the status filter changes', async () => {
    renderPage();
    await screen.findByText('Payment webhook');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'done');
    await waitFor(() => expect(screen.queryByText('Payment webhook')).toBeNull());
});

it('refetches when the team filter changes', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/teams')) {
            return j({ data: [{ id: 't1', name: 'Eng', identifier: 'ENG' }], links: { next: null } });
        }
        const teamFiltered = url.includes('filter%5Bteam_id%5D=t1') || url.includes('filter[team_id]=t1');
        return j({
            data: teamFiltered
                ? [{ id: 'i2', title: 'Team issue', status: 'todo' }]
                : [{ id: 'i1', title: 'Payment webhook', status: 'todo' }],
            meta: { current_page: 1, last_page: 1 }, links: {},
        });
    }));

    renderPage();
    await screen.findByText('Payment webhook');
    await userEvent.selectOptions(screen.getByLabelText('Team'), 't1');
    expect(await screen.findByText('Team issue')).toBeInTheDocument();
});
