import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from './ProjectsPage';

// Mock useNavigate while preserving all other react-router-dom exports.
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return { ...actual, useNavigate: () => mockNavigate };
});

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
        mockNavigate.mockReset();
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: meOwnerDev }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('renders the projects list', async () => {
        renderPage();
        expect(await screen.findByText('Projects')).toBeInTheDocument();
    });

    it('New project button navigates to /create?tab=project', async () => {
        renderPage();
        const btn = await screen.findByRole('button', { name: /New project/i });
        await userEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith('/create?tab=project');
    });

    it('New project button is hidden for non-developers', async () => {
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            if (url.includes('/v1/me')) return new Response(JSON.stringify({ data: { ...meOwnerDev, is_developer: false } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            return new Response(JSON.stringify({ data: [], links: { next: null, prev: null } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }));
        renderPage();
        // Wait for page to settle
        await screen.findByText('Projects');
        expect(screen.queryByRole('button', { name: /New project/i })).not.toBeInTheDocument();
    });
});
