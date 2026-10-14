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

function renderCard(unread: AppNotification[], count = unread.length) {
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if ((init?.method ?? 'GET') === 'POST') return j({ data: {} });
        if (u.includes('/notifications/unread-count')) return j({ data: { count } });
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
        expect(within(rows[0]).getByText('12m ago')).toBeInTheDocument();
        expect(within(rows[1]).getByRole('link', { name: 'You were assigned an issue' })).toBeInTheDocument();
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
});
