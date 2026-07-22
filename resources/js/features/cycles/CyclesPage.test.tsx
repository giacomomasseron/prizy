import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CyclesPage from './CyclesPage';
import type { Cycle } from '../../lib/types';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
const base = { team_id: 't1', cooldown_days: 0, created_at: '', updated_at: '' } as const;
const CYCLES: Cycle[] = [
    { ...base, id: 'c1', name: 'Cycle 22', starts_at: '2020-01-01', ends_at: '2020-01-14' }, // completed
    { ...base, id: 'c2', name: 'Cycle 99', starts_at: '2099-01-01', ends_at: '2099-01-14' }, // upcoming
    { ...base, id: 'c3', name: 'Cycle 50', starts_at: '2020-01-01', ends_at: '2099-01-01' }, // active (spans today)
];
const ME = { id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@e.com', admin_level: 'owner', is_developer: true, is_agent: false, email_digest_frequency: 'off' };

function renderPage(cyclesData: Cycle[] = CYCLES, me = ME) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/v1/me')) return j({ data: me });
        if (url.includes('/cycles')) return j({ data: cyclesData, links: { next: null } });
        if (url.includes('/teams')) return j({ data: [{ id: 't1', name: 'Smoke Team', identifier: 'SMK', color: '#6d69f2', created_at: '', updated_at: '' }], links: { next: null } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/teams/t1/cycles']}><Routes><Route path="/teams/:id/cycles" element={<CyclesPage />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('CyclesPage', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('renders a card per cycle with derived state tags', async () => {
        renderPage();
        expect(await screen.findByText('Cycle 22')).toBeInTheDocument();
        const tags = screen.getAllByTestId('cycle-tag').map((t) => t.textContent);
        expect(tags).toEqual(expect.arrayContaining(['Completed', 'Upcoming', 'Active']));
        expect(screen.getByTestId('cycles-count')).toHaveTextContent('3');
    });
    it('shows the New cycle button for a developer', async () => {
        renderPage();
        expect(await screen.findByRole('button', { name: 'New cycle' })).toBeInTheDocument();
    });
    it('hides create/delete for a non-developer', async () => {
        renderPage(CYCLES, { ...ME, is_developer: false });
        await screen.findByText('Cycle 22');
        expect(screen.queryByRole('button', { name: 'New cycle' })).toBeNull();
        expect(screen.queryByRole('button', { name: /^Delete / })).toBeNull();
    });
    it('shows the empty state when there are no cycles', async () => {
        renderPage([]);
        expect(await screen.findByText('No cycles in this team yet.')).toBeInTheDocument();
    });
});
