import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

function j(b: unknown, s = 200) {
    return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
}
function renderMenu(adminLevel = 'member') {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/members')) return j({ data: [] });
        if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex Rivera', email: 'a@e.com', admin_level: adminLevel, is_developer: false, is_agent: false, email_digest_frequency: 'off' } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><UserMenu /></MemoryRouter></QueryClientProvider>);
}

describe('UserMenu', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('is the sidebar account row: avatar, name and the line under it', async () => {
        renderMenu();
        const trigger = screen.getByTestId('user-menu-trigger');
        expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
        expect(trigger.textContent).toContain('Prizy workspace');
        expect((trigger.firstElementChild as HTMLElement).style.width).toBe('34px');
    });

    it('has no toolbar (avatar-only) form any more', () => {
        renderMenu();
        expect(screen.queryByTestId('toolbar-user-menu-trigger')).toBeNull();
    });

    it('opening the menu shows Settings + Logout, and no Integrations for a member', async () => {
        const user = userEvent.setup();
        renderMenu();
        await screen.findByText('Alex Rivera');
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: 'Integrations' })).toBeNull();
    });

    it('Integrations appears for owner/admin', async () => {
        const user = userEvent.setup();
        renderMenu('owner');
        await screen.findByText('Alex Rivera');
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(await screen.findByRole('menuitem', { name: 'Integrations' })).toBeInTheDocument();
    });
});
