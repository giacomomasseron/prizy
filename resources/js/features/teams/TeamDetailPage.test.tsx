import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamDetailPage from './TeamDetailPage';

// Mock useNavigate while preserving all other react-router-dom exports.
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

const meOwnerDev = { id: 'u1', admin_level: 'owner', is_developer: true, is_agent: false, workspace_id: 'w', name: 'A', email: 'a@x.co' };

describe('TeamDetailPage', () => {
    beforeEach(() => {
        mockNavigate.mockReset();
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/cycles')) return new Response(JSON.stringify({ data: [{ id: 'c1', team_id: 't1', name: 'Sprint 1', starts_at: '2026-01-01', ends_at: '2026-01-14', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meOwnerDev }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Eng', identifier: 'ENG', color: '#111', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    function renderPage() {
        return render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={['/teams/t1']}>
                    <Routes><Route path="/teams/:id" element={<TeamDetailPage />} /></Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );
    }

    it('lists the team cycles', async () => {
        renderPage();
        expect(await screen.findByText('Sprint 1')).toBeInTheDocument();
    });

    it('New cycle button navigates to /create?tab=cycle&team=<id>', async () => {
        renderPage();
        const btn = await screen.findByRole('button', { name: /New cycle/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith('/create?tab=cycle&team=t1');
    });

    it('New cycle button is hidden for non-developers', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/cycles')) return new Response(JSON.stringify({ data: [], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: { ...meOwnerDev, is_developer: false } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Eng', identifier: 'ENG', color: '#111', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        await screen.findByText('Cycles');
        expect(screen.queryByRole('button', { name: /New cycle/i })).not.toBeInTheDocument();
    });
});
