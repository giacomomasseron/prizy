import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from './NotificationsPage';

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><NotificationsPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('NotificationsPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/read-all')) return j(null, 204);
            if (url.match(/\/notifications\/n1\/read$/)) return j({ data: { id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: '2026-07-02T00:00:00.000000Z', created_at: '2026-07-01T00:00:00.000000Z' } });
            if (url.includes('/notifications')) return j({ data: [{ id: 'n1', type: 'issue_assigned', subject_type: 'issue', subject_id: 'i1', read_at: null, created_at: '2026-07-01T00:00:00.000000Z' }], links: { next: null } });
            return j({ data: {} });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('lists notifications and marks one read', async () => {
        renderPage();
        expect(await screen.findByText('You were assigned an issue')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Mark read' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.match(/\/notifications\/n1\/read$/) && i?.method === 'POST')).toBe(true);
        });
    });
});
