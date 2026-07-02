import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from './ProjectsPage';

function renderPage() {
    const qc = new QueryClient();
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter><ProjectsPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

const meOwnerDev = { id: 'u1', workspace_id: 'w1', name: 'A', email: 'a@x.co', admin_level: 'owner', is_developer: true, is_agent: false };

describe('ProjectsPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meOwnerDev }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/teams')) return new Response(JSON.stringify({ data: [{ id: 't1', name: 'Eng', identifier: 'ENG', color: '#111111', created_at: '', updated_at: '' }], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (url.includes('/v1/projects') && (init?.method ?? 'GET') === 'POST') return new Response(JSON.stringify({ data: { id: 'p2', name: 'Beta', description: null, icon: null, color: '#000000', status: 'planning', team_id: null, start_date: null, target_date: null, created_by: 'u1', created_at: '', updated_at: '' } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('creates a project via the inline form', async () => {
        renderPage();
        await userEvent.type(await screen.findByLabelText('Project name'), 'Beta');
        await userEvent.click(screen.getByRole('button', { name: 'Add project' }));
        await vi.waitFor(() => {
            const calls = (fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
            expect(calls.some(([u, i]) => u.includes('/v1/projects') && i?.method === 'POST')).toBe(true);
        });
    });
});
