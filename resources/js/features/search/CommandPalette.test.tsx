import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CommandPalette from './CommandPalette';
import { Drawer } from '../../components/ui/Drawer';
import * as commands from './commands';

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
    await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'payment');
    // No action matches "payment", so the issue is the first (highlighted) row.
    expect(await screen.findByText('Payment webhook')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/issues/i1'));
});

it('moves the highlight with ArrowDown to the "See all" row', async () => {
    renderPalette();
    await openPalette();
    await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'payment');
    await screen.findByText('Payment webhook');
    await userEvent.keyboard('{ArrowDown}{Enter}'); // issue (0) -> see-all (1)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/search?q=payment'));
});

it('filters actions by query and runs one', async () => {
    renderPalette();
    await openPalette();
    await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'board');
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
    await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'bug');

    // Title renders
    expect(await screen.findByText('Fix the bug')).toBeInTheDocument();
    // Identifier renders
    expect(screen.getByText('PRZ-42')).toBeInTheDocument();
    // StatusIcon renders with aria-label matching the status
    expect(screen.getByRole('img', { name: 'Status: In Progress' })).toBeInTheDocument();
});

it('shows an Advanced search footer that navigates to /search', async () => {
    renderPalette();
    await openPalette();
    const footer = await screen.findByRole('button', { name: /advanced search/i });
    await userEvent.click(footer);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining('/search'));
});

it('v2: the Modal frame (ink border, offset shadow, token backdrop), an esc hint, and a tinted active row', async () => {
    renderPalette();
    await openPalette();
    const dialog = await screen.findByRole('dialog', { name: 'Command palette' });
    expect(dialog.style.border).toBe('var(--line) solid var(--fg)');
    expect(dialog.style.boxShadow).toBe('5px 5px 0 var(--fg)');
    expect(dialog.parentElement!.style.background).toBe('var(--backdrop)');
    expect(screen.getByText('esc').tagName).toBe('KBD');
    await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'payment');
    const row = (await screen.findByText('Payment webhook')).closest<HTMLElement>('[role="option"]')!;
    expect(row.className).toContain('bg-accent2');
    expect(row.style.borderRadius).toBe('var(--radius-row)');
});

it('G3b: a combobox and a listbox — ↓ moves the active option, which the input announces', async () => {
    renderPalette();
    await openPalette();
    const input = screen.getByRole('combobox', { name: 'Search' });
    await userEvent.type(input, 'payment');
    await screen.findByText('Payment webhook');
    const list = screen.getByRole('listbox', { name: 'Results' });
    expect(input).toHaveAttribute('aria-controls', list.id);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const [issue, seeAll] = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-activedescendant', issue.id);
    expect(issue).toHaveAttribute('aria-selected', 'true');
    expect(issue.style.boxShadow).toBe('inset 3px 0 0 var(--fg)');
    await userEvent.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', seeAll.id);
    expect(seeAll).toHaveAttribute('aria-selected', 'true');
    expect(issue).toHaveAttribute('aria-selected', 'false');
    expect(issue.style.boxShadow).toBe('');
});

it('G3b: Tab stays inside the open palette, and focus returns to where it was when it closes', async () => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><button type="button">Before</button><CommandPalette /></MemoryRouter>
        </QueryClientProvider>,
    );
    const before = screen.getByRole('button', { name: 'Before' });
    before.focus();
    await openPalette();
    const input = await screen.findByRole('combobox', { name: 'Search' });
    expect(document.activeElement).toBe(input);
    const footer = screen.getByRole('button', { name: /advanced search/i });
    footer.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(before);
});

it('G3b: ↓ keeps the active option scrolled into view', async () => {
    const scrolled: { el: Element; arg: unknown }[] = [];
    Element.prototype.scrollIntoView = function (this: Element, arg?: unknown) { scrolled.push({ el: this, arg }); } as never;
    try {
        renderPalette();
        await openPalette();
        await userEvent.type(screen.getByRole('combobox', { name: 'Search' }), 'payment');
        await screen.findByText('Payment webhook');
        await userEvent.keyboard('{ArrowDown}');
        const [, seeAll] = screen.getAllByRole('option');
        expect(scrolled.at(-1)).toEqual({ el: seeAll, arg: { block: 'nearest' } });
    } finally {
        delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
});

it('G3b: Escape closes the palette from anywhere inside it, and the backdrop is presentational', async () => {
    renderPalette();
    await openPalette();
    expect(screen.getByRole('dialog').parentElement).toHaveAttribute('role', 'presentation');
    screen.getByRole('button', { name: /advanced search/i }).focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('G3b: Escape closes only the palette, not a drawer open under it', async () => {
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><Drawer open onClose={onClose} label="Peek">peek</Drawer><CommandPalette /></MemoryRouter>
        </QueryClientProvider>,
    );
    await openPalette();
    await screen.findByRole('dialog', { name: 'Command palette' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Peek' })).toBeInTheDocument();
});

it('G3c: "No results." lives in an always-rendered status region, empty while there are results', async () => {
    const { unmount } = renderPalette();
    await openPalette();
    await screen.findByRole('combobox', { name: 'Search' });
    const status = screen.getByRole('status');
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
    expect(status.textContent).toBe('');
    expect(status.closest('[role=listbox]')).toBeNull();
    unmount();
    // The empty list (the commands list can be empty, the search returns nothing).
    const spy = vi.spyOn(commands, 'filterCommands').mockReturnValue([]);
    try {
        renderPalette();
        await openPalette();
        await screen.findByRole('combobox', { name: 'Search' });
        expect(screen.queryAllByRole('option')).toHaveLength(0);
        expect(screen.getByRole('status').textContent).toBe('No results.');
        expect(screen.getByRole('status').closest('[role=listbox]')).toBeNull();
    } finally { spy.mockRestore(); }
});
