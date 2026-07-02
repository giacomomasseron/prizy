import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RoadmapPage from './RoadmapPage';

const scheduled = { id: 'p1', name: 'Website', color: '#4f46e5', status: 'in_progress', team_id: null, start_date: '2026-07-01', target_date: '2026-09-30', created_at: '', updated_at: '', milestones: [{ id: 'm1', name: 'Beta', target_date: '2026-08-01' }] };
const unscheduled = { id: 'p2', name: 'Research spike', color: '#888', status: 'planning', team_id: null, start_date: null, target_date: null, created_at: '', updated_at: '', milestones: [] };

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter><RoadmapPage /></MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('RoadmapPage', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [scheduled, unscheduled] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('renders a bar for a dated project and lists an undated one under Unscheduled', async () => {
        renderPage();
        expect(await screen.findByTestId('bar-p1')).toBeInTheDocument();
        expect(screen.getByTestId('ms-m1')).toBeInTheDocument();
        expect(screen.getByText('Unscheduled')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Research spike' })).toBeInTheDocument();
    });
});
