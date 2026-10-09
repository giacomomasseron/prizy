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
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
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
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
        });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        fireEvent.click(await screen.findByRole('button', { name: /delete team/i }));
        expect(await screen.findByText(/still has issues/i)).toBeInTheDocument();
    });

    it('header reflects the live team from the query, not the stale prop', async () => {
        mockFetch((url) => {
            if (url.endsWith('/teams')) return new Response(
                JSON.stringify({ data: [{ id: 't1', name: 'New Name', identifier: 'NN', color: '#111', member_count: 0, lead: null, created_at: '', updated_at: '' }], links: { next: null } }),
                { status: 200 },
            );
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            return new Response(JSON.stringify({ data: {} }), { status: 200 });
        });
        wrap(<TeamDrawer team={{ id: 't1', name: 'Old Name', identifier: 'ON', color: '#999' } as any} onClose={vi.fn()} />);
        expect(await screen.findByDisplayValue('New Name')).toBeInTheDocument();
    });

    it('v2: accent lead pill, red-hover remove and delete, pill add-member trigger', async () => {
        mockFetch((url) => {
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', role: 'lead' }] }), { status: 200 });
            // V2-G3c: a workspace member who is not on the team yet, so the add-member trigger is the live menu.
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [{ id: 'u2', name: 'Bob', email: 'b@x.test', admin_level: 'member', is_developer: true, is_agent: false, status: 'active', teams: [] }] }), { status: 200 });
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
        });
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        await screen.findByText('Ada');
        expect(screen.getByTestId('role-btn-a@x.test').className).toContain('bg-accent2');
        expect(screen.getByTestId('remove-a@x.test').className).toContain('hover:text-red');
        expect(screen.getByRole('button', { name: /delete team/i }).className).toContain('hover:border-red');
        expect(screen.getByRole('button', { name: /add member/i }).className).toContain('hover:border-fg');
        expect(screen.getByLabelText('Team name').style.fontFamily).toBe('var(--font-display)');
    });

    it('G3a: a lead pill writes accent text in the ink partner on its accent tint', async () => {
        mockFetch((url) => {
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', role: 'lead' }] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
        });
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        await screen.findByText('Ada');
        const classes = screen.getByTestId('role-btn-a@x.test').className.split(' ');
        expect(classes).toContain('text-accent-ink');
        expect(classes).not.toContain('text-accent');
        expect(classes).toContain('bg-accent2');
    });

    it('G3b: colour swatches say which is the team\'s colour', async () => {
        mockFetch(() => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 }));
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        expect(await screen.findByRole('button', { name: 'Set color #6366f1' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Set color #e0a13a' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('G3b: the team name field shows an ink underline while focused (no edge at rest)', async () => {
        mockFetch(() => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 }));
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        const name = await screen.findByLabelText('Team name');
        expect(name.className).toBe('border-transparent focus:border-fg');
        expect(name.style.borderStyle).toBe('solid');
    });

    it('G3c: Delete team is disabled while the delete is pending', async () => {
        mockFetch((url, init) => {
            // A delete that never settles keeps the mutation pending.
            if (url.includes('/teams/t1') && init?.method === 'DELETE') return new Promise<Response>(() => {}) as unknown as Response;
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
        });
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        try {
            wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
            const del = await screen.findByRole('button', { name: /delete team/i });
            expect(del).toBeEnabled();
            fireEvent.click(del);
            await waitFor(() => expect(del).toBeDisabled());
        } finally { confirmSpy.mockRestore(); }
    });

    it('G3c: with everyone already on the team, Add member is a disabled trigger with a title and opens no menu', async () => {
        mockFetch((url) => {
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', role: 'lead' }] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', admin_level: 'admin', is_developer: true, is_agent: false, status: 'active', teams: [] }] }), { status: 200 });
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
        });
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        await screen.findByText('Ada');
        const btn = await screen.findByRole('button', { name: 'Add member' });
        await waitFor(() => expect(btn).toBeDisabled());
        expect(btn).toHaveAttribute('title', 'Everyone is already on this team');
        expect(btn).toHaveTextContent('+ Add member');
        expect(btn.style.cursor).toBe('not-allowed');
        fireEvent.click(btn);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('G3c: the colour swatches are a group named Colour', async () => {
        mockFetch(() => new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 }));
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        expect(await screen.findByRole('group', { name: 'Colour' })).toBeInTheDocument();
    });

    it('G3c: only the member being removed has its remove button disabled', async () => {
        let release: () => void = () => {};
        const gate = new Promise<void>((r) => { release = r; });
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (init?.method === 'DELETE' && url.includes('/teams/t1/members/')) { await gate; return new Response(null, { status: 204 }); }
            if (url.includes('/teams/t1/members')) return new Response(JSON.stringify({ data: [{ id: 'u1', name: 'Ada', email: 'a@x.test', role: 'lead' }, { id: 'u2', name: 'Bob', email: 'b@x.test', role: 'member' }] }), { status: 200 });
            if (url.includes('/workspace/members')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
            return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200 });
        }));
        wrap(<TeamDrawer team={team as any} onClose={vi.fn()} />);
        fireEvent.click(await screen.findByTestId('remove-b@x.test'));
        await waitFor(() => expect(screen.getByTestId('remove-b@x.test')).toBeDisabled());
        expect(screen.getByTestId('remove-a@x.test')).toBeEnabled();
        release();
    });
});
