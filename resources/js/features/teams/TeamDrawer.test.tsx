import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamDrawer from './TeamDrawer';

const team = { id: 't1', name: 'Engineering', identifier: 'ENG', color: '#6366f1', member_count: 1, lead: null, created_at: '', updated_at: '' };

function wrap(ui: React.ReactElement) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => handler(String(url), init)));
}

describe('TeamDrawer', () => {
    it('lists members and adds a member (POST)', async () => {
        const posted: string[] = [];
        mockFetch((url, init) => {
            if (url.includes('/teams/t1/members') && init?.method === 'POST') { posted.push(url); return new Response(JSON.stringify({ data: { id: 'u2', name: 'Bob', email: 'b@x.test', role: 'member' } }), { status: 201 }); }
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', role: 'lead' }] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', admin_level: 'admin', is_developer: true, is_agent: false, status: 'active', teams: [] }, { id: 'u2', name: 'Bob', email: 'b@x.test', admin_level: 'member', is_developer: true, is_agent: false, status: 'active', teams: [] }] }), { status: 200 });
            return new Response(JSON.stringify({ data: {} }), { status: 200 });
        });
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        expect(await screen.findByText('Ada')).toBeInTheDocument();
        // Add "Bob" (a workspace member not on the team) — open the add-member menu then pick Bob.
        fireEvent.click(screen.getByRole('button', { name: /add member/i }));
        fireEvent.click(await screen.findByText('Bob'));
        await waitFor(() => expect(posted.length).toBe(1));
    });

    it('surfaces the has-issues 422 inline on delete', async () => {
        mockFetch((url, init) => {
            if (url.includes('/teams/t1') && init?.method === 'DELETE') return new Response(JSON.stringify({ title: 'Unprocessable', detail: 'Cannot delete a team that still has issues.' }), { status: 422 });
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            return new Response(JSON.stringify({ data: {} }), { status: 200 });
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        fireEvent.click(await screen.findByRole('button', { name: /delete team/i }));
        expect(await screen.findByText(/still has issues/i)).toBeInTheDocument();
    });
});
