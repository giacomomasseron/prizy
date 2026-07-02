import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeamDetailPage from './TeamDetailPage';

describe('TeamDetailPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/cycles')) return new Response(JSON.stringify({ data: [{ id: 'c1', team_id: 't1', name: 'Sprint 1', starts_at: '2026-01-01', ends_at: '2026-01-14', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: { id: 'u1', admin_level: 'owner', is_developer: true, is_agent: false, workspace_id: 'w', name: 'A', email: 'a@x.co' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Eng', identifier: 'ENG', color: '#111', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('lists the team cycles', async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={['/teams/t1']}>
                    <Routes><Route path="/teams/:id" element={<TeamDetailPage />} /></Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        expect(await screen.findByText('Sprint 1')).toBeInTheDocument();
    });
});
