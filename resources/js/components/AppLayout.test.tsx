import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './AppLayout';

function renderLayout() {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <AppLayout />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('AppLayout', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/unread-count')) return j({ data: { count: 0 } });
            if (url.includes('/notifications')) return j({ data: [], links: { next: null } });
            return j({ data: {} });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('renders the primary navigation links', () => {
        renderLayout();
        for (const label of ['Issues', 'Board', 'Teams', 'Projects', 'Roadmap', 'Labels']) {
            expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
        }
    });
});
