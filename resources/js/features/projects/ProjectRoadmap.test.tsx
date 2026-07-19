import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProjectRoadmap from './ProjectRoadmap';
import type { Milestone } from '../../lib/types';

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
// Past → 'done'; future → 'upcoming'
const MILESTONES: Milestone[] = [
    { id: 'm1', project_id: 'p1', name: 'Beta Launch', target_date: '2020-01-15', created_at: '', updated_at: '' },
    { id: 'm2', project_id: 'p1', name: 'GA Release', target_date: '2099-12-31', created_at: '', updated_at: '' },
];
function renderView(milestones: Milestone[] = MILESTONES) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (url.includes('/milestones')) return j({ data: milestones, links: { next: null } });
        return j({ data: {} });
    }));
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/projects/p1/roadmap']}><Routes><Route path="/projects/:id/roadmap" element={<ProjectRoadmap />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('ProjectRoadmap', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('lists milestones with Done + Upcoming tags', async () => {
        renderView();
        expect(await screen.findByText('Beta Launch')).toBeInTheDocument();
        const tags = screen.getAllByTestId('roadmap-tag').map((t) => t.textContent);
        expect(tags).toEqual(expect.arrayContaining(['Done', 'Upcoming']));
    });
    it('Done state chip filters to past milestones', async () => {
        renderView();
        await screen.findByText('Beta Launch');
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        await waitFor(() => expect(screen.queryByText('GA Release')).not.toBeInTheDocument());
        expect(screen.getByText('Beta Launch')).toBeInTheDocument();
    });
    it('shows empty state when no milestones', async () => {
        renderView([]);
        expect(await screen.findByText('No milestones in this state.')).toBeInTheDocument();
    });
});
