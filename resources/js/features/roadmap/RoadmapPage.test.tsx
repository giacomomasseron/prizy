import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RoadmapPage from './RoadmapPage';

const scheduled = {
    id: 'p1',
    name: 'Website',
    color: '#4f46e5',
    status: 'in_progress',
    team_id: null,
    start_date: '2026-07-01T00:00:00.000000Z',
    target_date: '2026-09-30T00:00:00.000000Z',
    progress: 40,
    created_at: '',
    updated_at: '',
    milestones: [{ id: 'm1', name: 'Beta', target_date: '2026-08-01T00:00:00.000000Z' }],
};
const unscheduled = {
    id: 'p2',
    name: 'Research spike',
    color: '#888',
    status: 'planning',
    team_id: null,
    start_date: null,
    target_date: null,
    created_at: '',
    updated_at: '',
    milestones: [],
};

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

    it('renders month header, bar with project name and progress, and milestone marker', async () => {
        renderPage();

        // Month header: at least one month label (Jul) should appear
        expect(await screen.findByText('Jul')).toBeInTheDocument();

        // Bar contains project name
        const bar = screen.getByTestId('bar-p1');
        expect(bar).toHaveTextContent('Website');

        // Bar contains progress percentage
        expect(bar).toHaveTextContent('40%');

        // Milestone marker is present
        expect(screen.getByTestId('ms-m1')).toBeInTheDocument();
    });

    it('v2: page header h1 "Roadmap", pill bars without a drop shadow, Unscheduled pills', async () => {
        renderPage();
        const h1 = await screen.findByRole('heading', { level: 1, name: 'Roadmap' });
        expect(h1.closest('header')).not.toBeNull();
        const bar = await screen.findByTestId('bar-p1');
        expect(bar.style.borderRadius).toBe('var(--radius-pill)');
        expect(bar.style.boxShadow).toBe('');
        const pill = screen.getByRole('link', { name: 'Research spike' });
        expect(pill.className).toContain('hover:border-fg');
        expect(pill.style.borderRadius).toBe('var(--radius-pill)');
    });

    it('v2: with only unscheduled projects there is no empty timeline card', async () => {
        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response(JSON.stringify({ data: [unscheduled] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        ));
        renderPage();
        expect(await screen.findByText('Unscheduled')).toBeInTheDocument();
        expect(screen.queryByTestId(/^bar-/)).toBeNull();
        const thisMonth = new Date().toLocaleString('en-US', { month: 'short' });
        expect(screen.queryByText(thisMonth)).toBeNull();
    });

    it("G3c: a failed roadmap load shows a retryable alert, not the empty state", async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } })));
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(<QueryClientProvider client={qc}><MemoryRouter><RoadmapPage /></MemoryRouter></QueryClientProvider>);
        expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the roadmap.");
        expect(screen.queryByText('No projects yet.')).toBeNull();
        expect(screen.getByRole('heading', { name: 'Roadmap' })).toBeInTheDocument();
    });
});
