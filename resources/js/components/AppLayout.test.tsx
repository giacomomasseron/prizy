import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './AppLayout';

function makeMe(adminLevel = 'member') {
    return {
        id: 'u1',
        workspace_id: 'w1',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        admin_level: adminLevel,
        // is_developer: true — this fixture exercises general sidebar/hotkey behaviour, not tracker
        // authorization (that's covered by GlobalSidebar.test.tsx); a developer keeps the tracker nav
        // + New-issue/C-hotkey affordances visible so those unrelated assertions keep working.
        is_developer: true,
        is_agent: false,
        email_digest_frequency: 'off' as const,
    };
}

function renderLayout(adminLevel = 'member', path = '/') {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Stub fetch: /me → user, /unread-count → 0
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown, s = 200) =>
            new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        // /members must precede /me: '/v1/members' contains the substring '/me'
        if ((url as string).includes('/members')) return j({ data: [] });
        if ((url as string).includes('/me')) return j({ data: makeMe(adminLevel) });
        if ((url as string).includes('/unread-count')) return j({ data: { count: 0 } });
        if ((url as string).includes('/notifications')) return j({ data: [], links: { next: null } });
        if ((url as string).includes('/teams')) return j({ data: [], links: { next: null } });
        if (/\/projects\/p1(\?|$)/.test(url as string)) return j({ data: { id: 'p1', name: 'Escalation Engine', color: '#6d69f2', status: 'in_progress', description: null, icon: null, team_id: null, start_date: null, target_date: null, lead_id: null, priority: 'high', created_by: 'u1', created_at: '', updated_at: '' } });
        if ((url as string).includes('/projects')) return j({ items: [], next: null });
        if ((url as string).includes('/issues')) return j({ data: [], links: { next: null } });
        return j({ data: {} });
    }));
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[path]}>
                <AppLayout />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('AppLayout sidebar', () => {
    beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());

    it('renders the redesigned sidebar sections', async () => {
        renderLayout();
        expect(await screen.findByText('Workspace')).toBeInTheDocument();
        expect(screen.getByText('My Teams')).toBeInTheDocument();
        expect(screen.getByText('Support bridge')).toBeInTheDocument();
    });

    it('collapses the sidebar and shows a re-open control', async () => {
        const user = userEvent.setup();
        renderLayout();
        await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }));
        expect(screen.queryByText('Workspace')).toBeNull();
        expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    });

    it('renders workspace name "Prizy"', () => {
        renderLayout();
        expect(screen.getByText('Prizy')).toBeInTheDocument();
    });

    it('renders Inbox nav link', () => {
        renderLayout();
        expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
    });

    it('renders user-menu-trigger button', () => {
        renderLayout();
        expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument();
    });

    it('opens user menu on trigger click and shows Settings + Logout', async () => {
        const user = userEvent.setup();
        renderLayout();
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
    });

    it('shows Integrations menuitem only for owner/admin', async () => {
        const user = userEvent.setup();
        renderLayout('owner');
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(await screen.findByRole('menuitem', { name: 'Integrations' })).toBeInTheDocument();
    });

    it('hides Integrations menuitem for member', async () => {
        const user = userEvent.setup();
        renderLayout('member');
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(await screen.findByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: 'Integrations' })).toBeNull();
    });

    it('ThemeToggle is rendered in sidebar', () => {
        renderLayout();
        expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument();
    });
});

describe('AppLayout C-hotkey', () => {
    beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());

    // The create drawer contains aria-label="Issue title" (the title input).
    // The sidebar "New issue" button does NOT have this, so it's a clean discriminator.
    function drawerIsOpen() {
        return screen.queryByLabelText(/Issue title/i) !== null;
    }

    it('opens the create drawer when C is pressed with nothing focused', async () => {
        renderLayout();
        // The hotkey is gated on `canDevelop`, derived from the (async-resolved) /me fetch — wait for
        // it to settle (surfaced by the sidebar's New-issue button) before firing the one-shot keydown,
        // otherwise the handler bails out on a still-loading `me`.
        await screen.findByRole('button', { name: /New issue/ });
        // Ensure no input is focused
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.keyDown(window, { key: 'c' });
        expect(await screen.findByLabelText(/Issue title/i)).toBeInTheDocument();
    });

    it('does NOT open the create drawer when C is pressed for a non-developer', async () => {
        // Exercises the disabled branch of the `canDevelop` gate (`if (!canDevelop) return;` in
        // AppLayout.tsx) — every other hotkey test in this file uses an is_developer:true fixture
        // (bumped for unrelated reasons; see the tracker-gating task), so none of them would catch a
        // regression that let a non-developer, non-owner, non-agent member open the create drawer.
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) =>
                new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if ((url as string).includes('/members')) return j({ data: [] });
            if ((url as string).includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Maya', email: 'm@e.com', admin_level: 'member', is_developer: false, is_agent: false, email_digest_frequency: 'off' } });
            if ((url as string).includes('/unread-count')) return j({ data: { count: 0 } });
            if ((url as string).includes('/notifications')) return j({ data: [], links: { next: null } });
            if ((url as string).includes('/teams')) return j({ data: [], links: { next: null } });
            // CreateIssueDrawer is mounted unconditionally by AppLayout (regardless of `open`) and
            // fetches the project list itself — matches the shape `renderLayout` above stubs.
            if ((url as string).includes('/projects')) return j({ items: [], next: null });
            if ((url as string).includes('/issues')) return j({ data: [], links: { next: null } });
            return j({ data: {} });
        }));
        render(
            <QueryClientProvider client={qc}>
                <MemoryRouter initialEntries={['/']}>
                    <AppLayout />
                </MemoryRouter>
            </QueryClientProvider>,
        );
        // Wait for `me` to actually resolve (so `canDevelop` has settled to false and the keydown
        // handler has re-bound) before firing the one-shot keydown. Unlike the developer fixture, no
        // tracker-gated element (Workspace, New issue, …) ever renders here to use as that signal — but
        // the sidebar footer/UserMenu shows the resolved user's name only once `me.data` is populated
        // (it renders "Loading…" beforehand), so that's the readiness signal instead.
        await screen.findByText('Maya');
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.keyDown(window, { key: 'c' });
        expect(drawerIsOpen()).toBe(false);
    });

    it('is suppressed when an <input> is focused', () => {
        renderLayout();
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();
        fireEvent.keyDown(window, { key: 'c' });
        expect(drawerIsOpen()).toBe(false);
        document.body.removeChild(input);
    });

    it('is suppressed when a <textarea> is focused', () => {
        renderLayout();
        const ta = document.createElement('textarea');
        document.body.appendChild(ta);
        ta.focus();
        fireEvent.keyDown(window, { key: 'c' });
        expect(drawerIsOpen()).toBe(false);
        document.body.removeChild(ta);
    });

    it('is suppressed when a contenteditable element is focused', () => {
        renderLayout();
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'true');
        document.body.appendChild(div);
        div.focus();
        fireEvent.keyDown(window, { key: 'c' });
        expect(drawerIsOpen()).toBe(false);
        document.body.removeChild(div);
    });

    it('is suppressed when the ⌘K palette is already open', () => {
        renderLayout();
        // Simulate the palette being present in the DOM
        const paletteEl = document.createElement('div');
        paletteEl.setAttribute('role', 'dialog');
        paletteEl.setAttribute('aria-label', 'Command palette');
        document.body.appendChild(paletteEl);
        fireEvent.keyDown(window, { key: 'c' });
        expect(drawerIsOpen()).toBe(false);
        document.body.removeChild(paletteEl);
    });

    it('is suppressed when the create drawer is already open', async () => {
        renderLayout();
        // Wait for `me` (and thus `canDevelop`) to resolve before the first keydown — see the
        // "opens the create drawer…" test above for why.
        await screen.findByRole('button', { name: /New issue/ });
        // First press opens the drawer
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.keyDown(window, { key: 'c' });
        await screen.findByLabelText(/Issue title/i);
        // Second press while drawer is open should be a no-op (createOpen guard)
        // The drawer remains open; there is exactly one title input
        fireEvent.keyDown(window, { key: 'c' });
        await waitFor(() =>
            expect(screen.getAllByLabelText(/Issue title/i)).toHaveLength(1),
        );
    });
});

describe('AppLayout project sidebar swap', () => {
    beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    afterEach(() => vi.unstubAllGlobals());
    it('shows the project sidebar (not the global one) on a project route', async () => {
        renderLayout('member', '/projects/p1/issues');
        expect(await screen.findByRole('link', { name: /All projects/ })).toBeInTheDocument();
        expect(screen.queryByText('My Teams')).toBeNull(); // global nav hidden
    });
    it('shows the global nav on a non-project route', async () => {
        renderLayout('member', '/');
        expect(await screen.findByText('My Teams')).toBeInTheDocument();
    });
});
