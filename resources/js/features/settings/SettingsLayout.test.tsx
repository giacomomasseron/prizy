import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsLayout, { RequireManage, StubPage } from './SettingsLayout';

function makeMe(adminLevel: string, isAgent = false, helpdeskEnabled = true) {
    return {
        id: 'u1', workspace_id: 'w1', name: 'Alice', email: 'a@x.co',
        admin_level: adminLevel, is_developer: false, is_agent: isAgent,
        email_digest_frequency: 'off' as const,
        workspace: { helpdesk_enabled: helpdeskEnabled },
    };
}

function stubFetch(adminLevel: string, isAgent = false, helpdeskEnabled = true) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown, s = 200) =>
            new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        // /workspace/members must match before /me (substring overlap)
        if ((url as string).includes('/workspace/members')) return j({ data: [{ id: 'u1', name: 'Alice', email: 'a@x.co', admin_level: 'owner', is_developer: false, is_agent: false, status: 'active', teams: [] }] });
        if ((url as string).includes('/me')) return j({ data: makeMe(adminLevel, isAgent, helpdeskEnabled) });
        return j({ data: {} });
    }));
}

function renderLayout(adminLevel: string, initialPath = '/settings/general', isAgent = false, helpdeskEnabled = true) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    stubFetch(adminLevel, isAgent, helpdeskEnabled);
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route path="/settings" element={<SettingsLayout />}>
                        <Route path="general" element={<div data-testid="general-content">general content</div>} />
                        <Route path="members" element={<RequireManage><div data-testid="members-content">members content</div></RequireManage>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('SettingsLayout', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('always shows the General nav item', async () => {
        renderLayout('member');
        expect(await screen.findByRole('link', { name: /general/i })).toBeInTheDocument();
    });

    it('shows Members nav item for owner', async () => {
        renderLayout('owner');
        // Wait for me query to settle and Members to appear
        expect(await screen.findByRole('link', { name: /members/i })).toBeInTheDocument();
    });

    it('shows Members nav item for admin', async () => {
        renderLayout('admin');
        expect(await screen.findByRole('link', { name: /members/i })).toBeInTheDocument();
    });

    it('hides Members nav item for member role', async () => {
        renderLayout('member');
        await screen.findByRole('link', { name: /general/i }); // wait for data to load
        expect(screen.queryByRole('link', { name: /members/i })).toBeNull();
        // Network-level guard: if `enabled: canManage` is ever removed from
        // useWorkspaceMembers, this assertion will catch the regression.
        const urls = vi.mocked(fetch).mock.calls.map(c => String(c[0]));
        expect(urls.some(u => u.includes('/workspace/members'))).toBe(false);
    });

    it('redirects non-admin away from /settings/members to /settings/general', async () => {
        renderLayout('member', '/settings/members');
        // After redirect, general-content should render, members-content should not
        expect(await screen.findByTestId('general-content')).toBeInTheDocument();
        expect(screen.queryByTestId('members-content')).toBeNull();
    });

    it('shows the helpdesk config links to an agent', async () => {
        renderLayout('member', '/settings/general', true, true);
        expect(await screen.findByRole('link', { name: 'Business hours' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'SLA policies' })).toBeInTheDocument();
    });

    it('drops the helpdesk config links when the workspace has the helpdesk off', async () => {
        renderLayout('owner', '/settings/general', true, false);
        // Anchor on another /me-gated row, so this cannot pass on the loading render.
        expect(await screen.findByRole('link', { name: 'Integrations' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Business hours' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'SLA policies' })).toBeNull();
    });

    it('v2: the back button is an outlined pill that clears the collapsed-sidebar button', async () => {
        renderLayout('member');
        const back = await screen.findByRole('button', { name: /Back to app/i });
        expect(back.className).toContain('hover:border-fg');
        expect(back.style.borderRadius).toBe('var(--radius-pill)');
        expect(back.style.margin).toContain('var(--nav-inset, 0px)');
    });

    it('v2: nav rows use the shared sidebar row style and keep their names', async () => {
        renderLayout('owner', '/settings/general');
        const members = await screen.findByRole('link', { name: /members/i });
        const general = screen.getByRole('link', { name: 'General' });
        expect(general.style.background).toBe('var(--panel)'); // active row
        expect(members.className).toContain('hover:bg-hover'); // inactive row
        expect(members.style.background).toBe('');
        expect(screen.getByRole('link', { name: 'Integrations' })).toBeInTheDocument(); // icons add no text
    });

    it('v2: Billing and Audit log stay disabled, and the footer shows the ink mark', async () => {
        renderLayout('member');
        await screen.findByRole('link', { name: 'General' });
        expect(screen.getByRole('button', { name: 'Billing' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Audit log' })).toBeDisabled();
        const mark = screen.getByText('Prizy').previousElementSibling as HTMLElement;
        expect(mark.textContent).toBe('P');
        expect(mark.style.borderRadius).toBe('50%');
        expect(mark.getAttribute('aria-hidden')).toBe('true');
    });
    it('v2: the settings sidebar adds no extra complementary landmark inside main', async () => {
        renderLayout('member');
        await screen.findByRole('link', { name: 'General' });
        expect(screen.queryByRole('complementary')).toBeNull();
    });
});

describe('StubPage', () => {
    it('v2: shows a highlighted title and the coming-soon note in a dashed box', () => {
        render(<StubPage title="Billing" />);
        const h1 = screen.getByRole('heading', { level: 1, name: 'Billing' });
        expect(h1.querySelector('.hl')).not.toBeNull();
        const note = screen.getByText('Billing — coming soon.');
        expect(note.style.border).toBe('var(--line) dashed var(--border2)');
    });

    it('G3b: the settings links are a named navigation landmark', async () => {
        renderLayout('owner');
        expect(await screen.findByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
    });
});
