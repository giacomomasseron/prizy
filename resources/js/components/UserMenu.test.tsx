import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserMenu } from './UserMenu';

function j(b: unknown, s = 200) {
    return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
}
function renderMenu(variant: 'full' | 'compact', adminLevel = 'member') {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/members')) return j({ data: [] });
        if (url.includes('/me')) return j({ data: { id: 'u1', workspace_id: 'w1', name: 'Alex Rivera', email: 'a@e.com', admin_level: adminLevel, is_developer: false, is_agent: false, email_digest_frequency: 'off' } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><UserMenu variant={variant} /></MemoryRouter></QueryClientProvider>);
}

describe('UserMenu', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('compact variant uses a distinct testid (not the sidebar one)', () => {
        renderMenu('compact');
        expect(screen.getByTestId('toolbar-user-menu-trigger')).toBeInTheDocument();
        expect(screen.queryByTestId('user-menu-trigger')).toBeNull();
    });

    it('full variant keeps the sidebar user-menu-trigger testid', () => {
        renderMenu('full');
        expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument();
        expect(screen.queryByTestId('toolbar-user-menu-trigger')).toBeNull();
    });

    it('compact: opening the menu shows Settings + Logout', async () => {
        const user = userEvent.setup();
        renderMenu('compact');
        await user.click(screen.getByTestId('toolbar-user-menu-trigger'));
        expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
    });

    it('compact: Integrations appears only for owner/admin', async () => {
        const user = userEvent.setup();
        renderMenu('compact', 'owner');
        await user.click(screen.getByTestId('toolbar-user-menu-trigger'));
        expect(await screen.findByRole('menuitem', { name: 'Integrations' })).toBeInTheDocument();
    });
});
