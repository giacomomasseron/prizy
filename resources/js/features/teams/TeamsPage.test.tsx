import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamsPage from './TeamsPage';

function renderPage() {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><TeamsPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

const meAdmin = { id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false };

describe('TeamsPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meAdmin }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/teams') && (init?.method ?? 'GET') === 'POST') return new Response(JSON.stringify({ data: { id: 't2', name: 'Design', identifier: 'DES', color: '#222222', created_at: '', updated_at: '' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('creates a team via the inline form', async () => {
        renderPage();
        await userEvent.type(await screen.findByLabelText('Team name'), 'Design');
        await userEvent.type(screen.getByLabelText('Team identifier'), 'DES');
        await userEvent.click(screen.getByRole('button', { name: 'Add team' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/v1/teams') && i?.method === 'POST')).toBe(true);
        });
    });

    it('hides the Add team button for a non-admin member', async () => {
        const meMember = { id: 'u1', workspace_id: 'w1', name: 'B', email: 'b@x.co', admin_level: 'member', is_developer: true, is_agent: false };
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meMember }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        // Wait for /v1/me to have resolved (teams list settles)
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls;
            expect(calls.some(([u]) => u.includes('/v1/me'))).toBe(true);
        });
        expect(screen.queryByRole('button', { name: 'Add team' })).toBeNull();
    });
});
