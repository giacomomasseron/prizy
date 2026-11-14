import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { AppNotification } from '../../lib/types';
import { NewForYouCard } from './NewForYouCard';

// Today v2: New for you.
function note(id: string, type: string, minutesAgo: number, extra: Partial<AppNotification> = {}): AppNotification {
    return {
        id, type, subject_type: 'issue', subject_id: `i-${id}`, read_at: null,
        created_at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
        actor: { id: `u-${id}`, name: 'Maya Chen' },
        subject: { type: 'issue', id: `i-${id}`, ref: `PRZ-${id.toUpperCase()}`, title: 'An issue', path: `/issues/i-${id}` },
        ...extra,
    };
}

function j(body: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

let fetchMock: ReturnType<typeof vi.fn>;

function renderCard(initial: AppNotification[], count = initial.length) {
    let unread = initial;
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        // Reading empties the inbox, so the refetch shows the rows leave.
        if ((init?.method ?? 'GET') === 'POST') { unread = []; return j({ data: {} }); }
        if (u.includes('/notifications/unread-count')) return j({ data: { count: unread.length > 0 ? count : 0 } });
        return j({ data: unread, links: { next: null } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><NewForYouCard /></MemoryRouter></QueryClientProvider>);
}

const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(path) && init?.method === 'POST');

afterEach(() => vi.unstubAllGlobals());

describe('Today v2: New for you', () => {
    it('shows up to five unread notifications in order, with the unread count, the line, the kind, the reference and the time', async () => {
        const unread = [
            note('a1', 'issue_mentioned', 12), note('b2', 'issue_assigned', 34, { actor: { id: 'u-b2', name: 'Leon Kraus' } }),
            note('c3', 'issue_commented', 60), note('d4', 'issue_status_changed', 120), note('e5', 'project_mentioned', 180), note('f6', 'issue_mentioned', 240),
        ];
        renderCard(unread, 9);

        await screen.findByRole('heading', { name: 'New for you' });
        await waitFor(() => expect(screen.getByTestId('new-for-you-count')).toHaveTextContent('9'));
        const rows = screen.getAllByTestId('new-for-you-row');
        expect(rows).toHaveLength(5);
        expect(within(rows[0]).getByRole('link', { name: 'Maya Chen mentioned you' })).toHaveAttribute('href', '/issues/i-a1');
        expect(within(rows[0]).getByText('Mention')).toBeInTheDocument();
        expect(within(rows[0]).getByText('PRZ-A1')).toBeInTheDocument();
        expect(within(rows[0]).getByText('12m')).toBeInTheDocument();
        expect(within(rows[1]).getByRole('link', { name: 'Leon Kraus assigned an issue to you' })).toBeInTheDocument();
        expect(within(rows[1]).getByText('34m')).toBeInTheDocument();
        expect(within(rows[2]).getByText('1h')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Assigned')).toBeInTheDocument();
        expect(within(rows[1]).getByTitle('Leon Kraus')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Open Inbox →' })).toHaveAttribute('href', '/notifications');
    });

    it('marks one read with ✓ and hands the focus to the heading', async () => {
        renderCard([note('a1', 'issue_mentioned', 12)]);
        await screen.findByRole('heading', { name: 'New for you' });

        fireEvent.click(screen.getByRole('button', { name: 'Mark read: Maya Chen mentioned you' }));

        await waitFor(() => expect(posts('/notifications/a1/read')).toHaveLength(1));
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'New for you' }));
    });

    it('marks one read when it is opened', async () => {
        renderCard([note('a1', 'issue_mentioned', 12)]);

        fireEvent.click(await screen.findByRole('link', { name: 'Maya Chen mentioned you' }));

        await waitFor(() => expect(posts('/notifications/a1/read')).toHaveLength(1));
    });

    it('marks everything read with Mark all read', async () => {
        renderCard([note('a1', 'issue_mentioned', 12), note('b2', 'issue_assigned', 34)]);

        fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }));

        await waitFor(() => expect(posts('/notifications/read-all')).toHaveLength(1));
    });

    it('is hidden when nothing is unread', async () => {
        renderCard([]);
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        await new Promise((r) => setTimeout(r, 0));

        expect(screen.queryByRole('heading', { name: 'New for you' })).toBeNull();
    });

    it('stays once you have read the last one here, says you are all caught up, and keeps the focus on its heading', async () => {
        renderCard([note('a1', 'issue_mentioned', 12)]);

        fireEvent.click(await screen.findByRole('button', { name: 'Mark read: Maya Chen mentioned you' }));

        expect(await screen.findByText("You’re all caught up.")).toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'New for you' }));
        expect(screen.queryByRole('button', { name: 'Mark all read' })).toBeNull();
        expect(screen.queryByTestId('new-for-you-count')).toBeNull();
    });

    it('stays after Mark all read, says you are all caught up, and keeps the focus on its heading', async () => {
        renderCard([note('a1', 'issue_mentioned', 12), note('b2', 'issue_assigned', 34)]);

        fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }));

        expect(await screen.findByText("You’re all caught up.")).toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'New for you' }));
        expect(screen.queryAllByTestId('new-for-you-row')).toHaveLength(0);
    });
});

describe('Today: New for you, as the design', () => {
    it('names who assigned the issue, and falls back to the plain line when nobody is named', async () => {
        renderCard([
            note('a1', 'issue_assigned', 5, { actor: { id: 'u1', name: 'Leon Kraus' } }),
            note('b2', 'issue_assigned', 6, { actor: null }),
        ]);
        expect(await screen.findByRole('link', { name: 'Leon Kraus assigned an issue to you' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'You were assigned an issue' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mark read: Leon Kraus assigned an issue to you' })).toBeInTheDocument();
    });

    it('colours the kind chip by kind: Mention in the accent, Assigned in blue, the rest quiet', async () => {
        renderCard([note('a1', 'issue_mentioned', 1), note('b2', 'issue_assigned', 2), note('c3', 'issue_commented', 3), note('d4', 'issue_status_changed', 4)]);
        await screen.findAllByTestId('new-for-you-row');
        const chip = (label: string) => screen.getByText(label).closest('span[style]') as HTMLElement;
        expect(chip('Mention').style.color).toBe('var(--accent-ink)');
        expect(chip('Assigned').style.color).toBe('var(--blue-ink)');
        expect(chip('Comment').style.color).toBe('var(--fg2)');
        expect(chip('Status').style.color).toBe('var(--fg2)');
        for (const label of ['Mention', 'Assigned', 'Comment', 'Status']) {
            expect(chip(label).style.fontWeight).toBe('700');
            expect(chip(label).style.borderColor).toBe('var(--border)');
        }
    });

    it('writes the time short: now, 12m, 3h, 2d', async () => {
        renderCard([note('a1', 'issue_mentioned', 0), note('b2', 'issue_mentioned', 12), note('c3', 'issue_mentioned', 3 * 60), note('d4', 'issue_mentioned', 2 * 24 * 60)]);
        const rows = await screen.findAllByTestId('new-for-you-row');
        expect(rows.map((r) => within(r).getByTestId('new-for-you-time').textContent)).toEqual(['now', '12m', '3h', '2d']);
    });

    it('gives a notice nobody sent a gear on a dark circle where the avatar goes', async () => {
        renderCard([note('a1', 'issue_unblocked', 5, { actor: null }), note('b2', 'issue_mentioned', 6)]);
        const rows = await screen.findAllByTestId('new-for-you-row');
        const gear = within(rows[0]).getByText('⚙');
        expect(gear).toHaveAttribute('aria-hidden', 'true');
        expect(gear.style.width).toBe('28px');
        expect(gear.style.borderRadius).toBe('50%');
        expect(gear.style.background).toBe('var(--fg2)');
        expect(gear.style.color).toBe('var(--bg)');
        expect(within(rows[1]).queryByText('⚙')).toBeNull();
        expect(within(rows[1]).getByTitle('Maya Chen')).toBeInTheDocument();
    });
});
