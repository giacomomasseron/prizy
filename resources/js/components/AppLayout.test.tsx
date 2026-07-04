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
        is_developer: false,
        is_agent: false,
        email_digest_frequency: 'off' as const,
    };
}

function renderLayout(adminLevel = 'member') {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Stub fetch: /me → user, /unread-count → 0
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const j = (b: unknown, s = 200) =>
            new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
        if ((url as string).includes('/me')) return j({ data: makeMe(adminLevel) });
        if ((url as string).includes('/unread-count')) return j({ data: { count: 0 } });
        if ((url as string).includes('/notifications')) return j({ data: [], links: { next: null } });
        if ((url as string).includes('/teams')) return j({ items: [], next: null });
        if ((url as string).includes('/projects')) return j({ items: [], next: null });
        if ((url as string).includes('/issues')) return j({ data: [], links: { next: null } });
        return j({ data: {} });
    }));
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('AppLayout sidebar', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('renders primary nav links (no Board, no Cycles)', () => {
        renderLayout();
        for (const label of ['Issues', 'Projects', 'Roadmap', 'Teams', 'Labels']) {
            expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
        }
        expect(screen.queryByRole('link', { name: 'Board' })).toBeNull();
        expect(screen.queryByRole('link', { name: 'Cycles' })).toBeNull();
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
    afterEach(() => vi.unstubAllGlobals());

    // The create drawer contains aria-label="Issue title" (the title input).
    // The sidebar "New issue" button does NOT have this, so it's a clean discriminator.
    function drawerIsOpen() {
        return screen.queryByLabelText(/Issue title/i) !== null;
    }

    it('opens the create drawer when C is pressed with nothing focused', async () => {
        renderLayout();
        // Ensure no input is focused
        (document.activeElement as HTMLElement | null)?.blur();
        fireEvent.keyDown(window, { key: 'c' });
        expect(await screen.findByLabelText(/Issue title/i)).toBeInTheDocument();
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
