import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';

function renderBell() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><NotificationBell /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('NotificationBell', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/unread-count')) return j({ data: { count: 2 } });
            if (url.includes('/notifications') && (init?.method ?? 'GET') === 'GET') return j({ data: [{ id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: '2026-07-01T00:00:00.000000Z' }], links: { next: null } });
            if (url.includes('/read-all')) return j(null, 204);
            return j({ data: {} });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows the unread badge and opens a dropdown that can mark all read', async () => {
        renderBell();
        expect(await screen.findByText('2')).toBeInTheDocument(); // badge
        await userEvent.click(screen.getByRole('button', { name: 'Notifications' }));
        expect(await screen.findByText('You were assigned an issue')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/read-all') && i?.method === 'POST')).toBe(true);
        });
    });
});
