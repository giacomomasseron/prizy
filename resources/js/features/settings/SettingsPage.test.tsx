import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralPage from './GeneralPage';

const me = { id: 'u1', workspace_id: 'w', name: 'A', email: 'a@x.co', admin_level: 'member', is_developer: true, is_agent: false, email_digest_frequency: 'off' };

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><GeneralPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('GeneralPage (email-digest settings)', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return j({ data: me });
            if (url.includes('/notifications/preferences')) return new Response(null, { status: 204 });
            return j({ data: {} });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows the current digest frequency and PATCHes on change', async () => {
        renderPage();
        const select = await screen.findByLabelText('Email digest frequency');
        expect((select as HTMLSelectElement).value).toBe('off');
        await userEvent.selectOptions(select, 'daily');
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/notifications/preferences') && i?.method === 'PATCH')).toBe(true);
        });
    });
});
