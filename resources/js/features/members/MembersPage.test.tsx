import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MembersPage from './MembersPage';
import type { WorkspaceMember } from './workspaceHooks';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeMember(overrides?: Partial<WorkspaceMember>): WorkspaceMember {
    return {
        id: 'u1',
        name: 'Alice Owner',
        email: 'alice@example.com',
        admin_level: 'owner',
        is_developer: false,
        is_agent: false,
        status: 'active',
        teams: [],
        ...overrides,
    };
}

function makeMe(adminLevel = 'owner') {
    return {
        id: 'u1',
        workspace_id: 'w1',
        name: 'Alice',
        email: 'alice@example.com',
        admin_level: adminLevel,
        is_developer: false,
        is_agent: false,
        email_digest_frequency: 'off' as const,
    };
}

function j(b: unknown, s = 200) {
    return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
}

function stubFetch(members: WorkspaceMember[], meAdminLevel = 'owner') {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init?: RequestInit) => {
            // /workspace/members must come before /me (substring overlap: '/workspace/members' contains '/me')
            if (url.includes('/workspace/members')) return j({ data: members });
            if (url.includes('/me')) return j({ data: makeMe(meAdminLevel) });
            if (url.includes('/members/') && init?.method === 'PATCH') return j({ data: members[0] ?? {} });
            if (url.includes('/members/') && init?.method === 'DELETE') return new Response(null, { status: 204 });
            if (url.includes('/invitations/') && init?.method === 'DELETE') return new Response(null, { status: 204 });
            return j({ data: {} });
        }),
    );
}

function renderPage(members: WorkspaceMember[], meAdminLevel = 'owner') {
    stubFetch(members, meAdminLevel);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <MembersPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('MembersPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    // 1. renders active + invited rows distinctly
    it('renders active and invited rows with distinct status labels', async () => {
        const members = [
            makeMember({ id: 'u1', name: 'Alice', email: 'alice@x.co', status: 'active' }),
            makeMember({ id: 'inv:ABC123', name: 'Bob', email: 'bob@x.co', status: 'invited' }),
        ];
        renderPage(members);
        expect(await screen.findByText('Alice')).toBeInTheDocument();
        expect(await screen.findByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Invited')).toBeInTheDocument();
    });

    // 2. level Menu items call PATCH with correct value
    it('level menu item calls PATCH /members/{id} with correct admin_level', async () => {
        const user = userEvent.setup();
        const members = [makeMember({ id: 'u2', name: 'Bob', email: 'b@x.co', admin_level: 'member', status: 'active' })];
        renderPage(members);
        await screen.findByText('Bob');
        // Open the Level menu
        await user.click(screen.getByRole('button', { name: /Level: Member/i }));
        // Click the Admin menu item
        await user.click(screen.getByRole('menuitem', { name: 'Admin' }));
        await vi.waitFor(() => {
            const calls = vi.mocked(fetch).mock.calls as [string, RequestInit?][];
            expect(
                calls.some(
                    ([u, i]) =>
                        u.includes('/members/u2') &&
                        i?.method === 'PATCH' &&
                        JSON.parse(i.body as string)?.admin_level === 'admin',
                ),
            ).toBe(true);
        });
    });

    // 3. capability chip toggle calls PATCH with correct boolean
    it('Developer chip calls PATCH /members/{id} with is_developer flipped', async () => {
        const user = userEvent.setup();
        const members = [makeMember({ id: 'u3', name: 'Carol', email: 'c@x.co', is_developer: false, status: 'active' })];
        renderPage(members);
        await screen.findByText('Carol');
        await user.click(screen.getByRole('button', { name: /Developer/i }));
        await vi.waitFor(() => {
            const calls = vi.mocked(fetch).mock.calls as [string, RequestInit?][];
            expect(
                calls.some(
                    ([u, i]) =>
                        u.includes('/members/u3') &&
                        i?.method === 'PATCH' &&
                        JSON.parse(i.body as string)?.is_developer === true,
                ),
            ).toBe(true);
        });
    });

    // 3b. agent chip toggle calls PATCH with correct boolean
    it('Agent chip calls PATCH /members/{id} with is_agent flipped', async () => {
        const user = userEvent.setup();
        const members = [makeMember({ id: 'u3b', name: 'Carol', email: 'c@x.co', is_agent: false, status: 'active' })];
        renderPage(members);
        await screen.findByText('Carol');
        await user.click(screen.getByRole('button', { name: /Agent/i }));
        await vi.waitFor(() => {
            const calls = vi.mocked(fetch).mock.calls as [string, RequestInit?][];
            expect(
                calls.some(
                    ([u, i]) =>
                        u.includes('/members/u3b') &&
                        i?.method === 'PATCH' &&
                        JSON.parse(i.body as string)?.is_agent === true,
                ),
            ).toBe(true);
        });
    });

    // 4. remove button for active member calls DELETE /members/{id}
    it('remove button for active member calls DELETE /members/{id} after confirm', async () => {
        const user = userEvent.setup();
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const members = [makeMember({ id: 'u4', name: 'Dave', email: 'd@x.co', status: 'active' })];
        renderPage(members);
        await screen.findByText('Dave');
        await user.click(screen.getAllByRole('button', { name: '×' })[0]);
        await vi.waitFor(() => {
            const calls = vi.mocked(fetch).mock.calls as [string, RequestInit?][];
            expect(
                calls.some(([u, i]) => u.includes('/members/u4') && i?.method === 'DELETE'),
            ).toBe(true);
        });
        confirmSpy.mockRestore();
    });

    // 5. remove button for invited row calls DELETE /invitations/{id} (stripped)
    it('remove button for invited row calls DELETE /invitations/{invId} without confirm', async () => {
        const user = userEvent.setup();
        const members = [makeMember({ id: 'inv:ABC123', name: 'Eve', email: 'e@x.co', status: 'invited' })];
        renderPage(members);
        await screen.findByText('Eve');
        await user.click(screen.getAllByRole('button', { name: '×' })[0]);
        await vi.waitFor(() => {
            const calls = vi.mocked(fetch).mock.calls as [string, RequestInit?][];
            expect(
                calls.some(([u, i]) => u.includes('/invitations/ABC123') && i?.method === 'DELETE'),
            ).toBe(true);
        });
    });

    // 6. no-access banner shows only when member-level user has no capabilities
    it('shows no-access banner when active member-level user has no capabilities, hides otherwise', async () => {
        // With a no-capability member: banner should appear
        const { unmount } = renderPage([
            makeMember({ id: 'u5', name: 'Frank', email: 'f@x.co', admin_level: 'member', is_developer: false, is_agent: false, status: 'active' }),
        ]);
        await screen.findByText('Frank');
        expect(screen.getByText(/no capability enabled/i)).toBeInTheDocument();
        unmount();
        vi.unstubAllGlobals();

        // With a member who HAS a capability: banner should NOT appear
        renderPage([
            makeMember({ id: 'u6', name: 'Grace', email: 'g@x.co', admin_level: 'member', is_developer: true, is_agent: false, status: 'active' }),
        ]);
        await screen.findByText('Grace');
        expect(screen.queryByText(/no capability enabled/i)).toBeNull();
    });

    // 7. stats compute correctly (total, admins, devs, agents)
    it('stats grid displays correct counts for total / admins / devs / agents', async () => {
        const members = [
            makeMember({ id: 'u1', name: 'Alice Owner', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false, status: 'active' }),
            makeMember({ id: 'u2', name: 'Bob Admin', email: 'b@x.co', admin_level: 'admin', is_developer: true, is_agent: false, status: 'active' }),
            makeMember({ id: 'u3', name: 'Carol Member', email: 'c@x.co', admin_level: 'member', is_developer: true, is_agent: true, status: 'active' }),
            makeMember({ id: 'u4', name: 'Dave Viewer', email: 'd@x.co', admin_level: 'viewer', is_developer: false, is_agent: false, status: 'invited' }),
        ];
        // Total: 4 | Admins: 2 (owner + admin) | Devs: 3 | Agents: 1
        renderPage(members);
        await screen.findByText('Alice Owner');
        expect(screen.getByTestId('stat-total').textContent).toBe('4');
        expect(screen.getByTestId('stat-admins').textContent).toBe('2');
        expect(screen.getByTestId('stat-devs').textContent).toBe('3');
        expect(screen.getByTestId('stat-agents').textContent).toBe('1');
    });

    // 8. owner-only 'owner' level option hidden for admin actor
    it('hides Owner level option in menu when actor is admin (not owner)', async () => {
        const user = userEvent.setup();
        const members = [makeMember({ id: 'u1', name: 'Alice', email: 'a@x.co', admin_level: 'member', status: 'active' })];
        renderPage(members, 'admin'); // actor is admin, not owner
        await screen.findByText('Alice');
        await user.click(screen.getByRole('button', { name: /Level: Member/i }));
        // Owner option must NOT appear for admin actor
        expect(screen.queryByRole('menuitem', { name: 'Owner' })).toBeNull();
        // Other options must be present
        expect(screen.getByRole('menuitem', { name: 'Admin' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Member' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Viewer' })).toBeInTheDocument();
    });
});
