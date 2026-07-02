import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectDetailPage from './ProjectDetailPage';

describe('ProjectDetailPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/milestones')) return new Response(JSON.stringify({ data: [{ id: 'm1', project_id: 'p1', name: 'Beta', target_date: '2026-03-01', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: { id: 'u1', admin_level: 'owner', is_developer: true, is_agent: false, workspace_id: 'w', name: 'A', email: 'a@x.co' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [{ id: 'p1', name: 'Alpha', identifier: 'ALP', status: 'active', color: '#111', created_at: '', updated_at: '' }], links: { next: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('lists the project milestones', async () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={['/projects/p1']}>
                    <Routes><Route path="/projects/:id" element={<ProjectDetailPage />} /></Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        expect(await screen.findByText('Beta')).toBeInTheDocument();
    });
});
