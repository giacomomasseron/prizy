import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CommandPalette from './CommandPalette';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<any>()), useNavigate: () => navigate }));

function renderPalette() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><CommandPalette /></MemoryRouter>
        </QueryClientProvider>,
    );
}

beforeEach(() => {
    navigate.mockClear();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/v1/search')) return j({ data: { issues: [{ id: 'i1', title: 'Payment webhook' }], projects: [], teams: [] } });
        return j({ data: {} });
    }));
});
afterEach(() => vi.unstubAllGlobals());

function openPalette() {
    return userEvent.keyboard('{Meta>}k{/Meta}');
}

it('opens on Cmd+K and closes on Escape', async () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).toBeNull();
    await openPalette();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('searches and navigates to the highlighted issue on Enter', async () => {
    renderPalette();
    await openPalette();
    await userEvent.type(screen.getByRole('textbox'), 'payment');
    // No action matches "payment", so the issue is the first (highlighted) row.
    expect(await screen.findByText('Payment webhook')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/issues/i1'));
});

it('moves the highlight with ArrowDown to the "See all" row', async () => {
    renderPalette();
    await openPalette();
    await userEvent.type(screen.getByRole('textbox'), 'payment');
    await screen.findByText('Payment webhook');
    await userEvent.keyboard('{ArrowDown}{Enter}'); // issue (0) -> see-all (1)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/search?q=payment'));
});

it('filters actions by query and runs one', async () => {
    renderPalette();
    await openPalette();
    await userEvent.type(screen.getByRole('textbox'), 'board');
    const action = await screen.findByText('Go to Board');
    await action.click();
    expect(navigate).toHaveBeenCalledWith('/board');
});

it('issue rows render StatusIcon + identifier + title', async () => {
    // Override fetch to return a complete issue with status and identifier
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.includes('/v1/search')) {
            return j({
                data: {
                    issues: [{
                        id: 'i99',
                        title: 'Fix the bug',
                        status: 'in_progress',
                        identifier: 'PRZ-42',
                        priority: 'high',
                        description: null,
                        estimate: null,
                        due_date: null,
                        sort_order: 0,
                        team_id: 't1',
                        project_id: null,
                        cycle_id: null,
                        parent_issue_id: null,
                        assignee_id: null,
                        created_by: 'u1',
                        archived_at: null,
                        labels: [],
                        created_at: '2026-07-04T00:00:00.000000Z',
                        updated_at: '2026-07-04T00:00:00.000000Z',
                    }],
                    projects: [],
                    teams: [],
                },
            });
        }
        return j({ data: {} });
    }));

    renderPalette();
    await openPalette();
    await userEvent.type(screen.getByRole('textbox'), 'bug');

    // Title renders
    expect(await screen.findByText('Fix the bug')).toBeInTheDocument();
    // Identifier renders
    expect(screen.getByText('PRZ-42')).toBeInTheDocument();
    // StatusIcon renders with aria-label matching the status
    expect(screen.getByRole('generic', { name: 'in_progress' })).toBeInTheDocument();
});

it('shows an Advanced search footer that navigates to /search', async () => {
    renderPalette();
    await openPalette();
    const footer = await screen.findByRole('button', { name: /advanced search/i });
    await userEvent.click(footer);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/search'));
});
