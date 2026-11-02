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

    it('v2: a PageHeader title, the ink New team Button, and team rows that link with a hover', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meAdmin }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Smoke Team', identifier: 'SMK', color: '#6d69f2', created_at: '', updated_at: '' }], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        expect(screen.getByRole('heading', { name: 'Teams' }).style.fontFamily).toBe('var(--font-display)');
        const row = await screen.findByRole('link', { name: /Smoke Team/ });
        expect(row).toHaveAttribute('href', '/teams/t1');
        expect(row.className).toContain('hover:bg-hover');
        expect((await screen.findByRole('button', { name: /new team/i })).className).toContain('bg-fg');
    });

    it('v2: no empty list card when there are no teams', async () => {
        renderPage();
        await screen.findByRole('button', { name: /new team/i });
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('v2: an empty workspace shows "No teams yet." in the dashed empty state', async () => {
        renderPage();
        expect(await screen.findByText('No teams yet.')).toBeInTheDocument();
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('v2: team rows sit on a white card, the tile shows two letters, and the body is not capped', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meAdmin }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Smoke Team', identifier: 'SMOKE1', color: '#6d69f2', created_at: '', updated_at: '' }], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        const row = await screen.findByRole('link', { name: /Smoke Team/ });
        const list = row.closest('ul')!;
        expect(list.style.background).toBe('var(--panel)');
        expect(list.parentElement!.style.maxWidth).toBe('');
        expect(screen.getByText('SM')).toBeInTheDocument();
        expect(screen.getByText('SMOKE1')).toBeInTheDocument();
    });

    it("G3c: a failed teams load shows a retryable alert, not the empty state", async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meAdmin }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><TeamsPage /></MemoryRouter></QueryClientProvider>);
        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load teams.");
        expect(screen.queryByText('No teams yet.')).toBeNull();
        expect(screen.getByRole('heading', { name: 'Teams' })).toBeInTheDocument();
    });

    it('G3c: the tile clips the key itself, so its title is the full key', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meAdmin }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Smoke Team', identifier: 'SMOKE1', color: '#6d69f2', created_at: '', updated_at: '' }], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        const tile = (await screen.findByText('SM')) as HTMLElement;
        expect(tile).toHaveAttribute('title', 'SMOKE1');
    });
});
