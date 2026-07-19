import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SidebarFooter } from './SidebarFooter';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function renderFooter(adminLevel = 'member') {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/members')) return j({ data: [] });
        if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex Rivera', email: 'a@e.com', admin_level: adminLevel, is_developer: false, is_agent: false, email_digest_frequency: 'off' } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><SidebarFooter /></MemoryRouter></QueryClientProvider>);
}

describe('SidebarFooter', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('shows Settings + Logout for any user', async () => {
        const user = userEvent.setup();
        renderFooter('member');
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
    });
    it('shows Integrations only for owner/admin', async () => {
        const user = userEvent.setup();
        renderFooter('owner');
        await user.click(screen.getByTestId('user-menu-trigger'));
        expect(await screen.findByRole('menuitem', { name: 'Integrations' })).toBeInTheDocument();
    });
    it('renders ThemeToggle', () => {
        renderFooter();
        expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument();
    });
});
