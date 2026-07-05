import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamsPage from './TeamsPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<any>()), useNavigate: () => navigate }));

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
        navigate.mockClear();
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meAdmin }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows a New team button for admins that navigates to /settings/teams', async () => {
        renderPage();
        const btn = await screen.findByRole('button', { name: /new team/i });
        await userEvent.click(btn);
        expect(navigate).toHaveBeenCalledWith('/settings/teams');
    });

    it('hides the New team button for a non-admin member', async () => {
        const meMember = { id: 'u1', workspace_id: 'w1', name: 'B', email: 'b@x.co', admin_level: 'member', is_developer: true, is_agent: false };
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meMember }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string][] } }).mock.calls;
            expect(calls.some(([u]) => u.includes('/v1/me'))).toBe(true);
        });
        expect(screen.queryByRole('button', { name: /new team/i })).toBeNull();
    });
});
