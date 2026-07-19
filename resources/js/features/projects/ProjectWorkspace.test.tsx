import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspace from './ProjectWorkspace';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
function renderWorkspace(path: string, found = true) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/projects/')) return found ? j({ data: { id: 'p1', name: 'Escalation Engine', color: '#6d69f2', status: 'in_progress', description: null, icon: null, team_id: null, start_date: null, target_date: null, lead_id: null, priority: 'high', created_by: 'u1', created_at: '', updated_at: '' } }) : j({ message: 'Not found' }, 404);
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><Routes><Route path="/projects/:id" element={<ProjectWorkspace />}><Route path="issues" element={<div>ISSUES VIEW</div>} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}

describe('ProjectWorkspace', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('renders breadcrumb with the view label and the child outlet', async () => {
        renderWorkspace('/projects/p1/issues');
        expect(await screen.findByText('ISSUES VIEW')).toBeInTheDocument();
        expect(screen.getByText('Escalation Engine')).toBeInTheDocument();
        // breadcrumb view label
        expect(screen.getByText('Issues')).toBeInTheDocument();
    });
    it('shows a not-found message for a missing project', async () => {
        renderWorkspace('/projects/p1', false);
        expect(await screen.findByText('Project not found.')).toBeInTheDocument();
    });
});
