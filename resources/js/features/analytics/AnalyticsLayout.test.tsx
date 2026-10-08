import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsLayout from './AnalyticsLayout';
import type { CycleReport, TrackerOverviewReport } from '../../lib/types';

const overview: TrackerOverviewReport = {
    kpis: {
        created: { value: 4, delta_pct: 300 },
        completed: { value: 2, delta_pct: 100 },
        active: { value: 1, delta_pct: null },
        median_cycle_time_minutes: { value: 2880, delta_pct: 5 },
    },
    sparklines: { created: [1, 3], completed: [0, 2] },
    flow: { labels: ['Sep 1', 'Sep 2'], created: [1, 3], completed: [0, 2] },
    by_status: [{ key: 'todo', count: 2 }],
    by_priority: [{ key: 'medium', count: 2 }],
};

const cycleReport: CycleReport = {
    cycles: [{ id: 'c1', name: 'Cycle 1', starts_at: '2026-09-01', ends_at: '2026-09-14', completed_count: 1, total_count: 2 }],
    burndown: { cycle_id: 'c1', name: 'Cycle 1', starts_at: '2026-09-01', ends_at: '2026-09-14', total_scope: 2, days: [{ date: '2026-09-01', remaining: 2 }, { date: '2026-09-02', remaining: 1 }] },
};

vi.mock('./hooks', () => ({
    useTrackerOverview: () => ({ data: overview, isLoading: false }),
    useCycleReport: () => ({ data: cycleReport, isLoading: false }),
}));
vi.mock('../teams/hooks', () => ({
    useTeams: () => ({ data: { items: [{ id: 't1', name: 'Smoke Team', identifier: 'SMK' }] } }),
}));
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: { id: 'u1', name: 'Dev', admin_level: 'owner', is_developer: true } }),
}));

function renderLayout() {
    return render(<MemoryRouter><AnalyticsLayout /></MemoryRouter>);
}

describe('AnalyticsLayout', () => {
    it('shows the overview KPIs and flow chart by default', () => {
        renderLayout();
        expect(screen.getByText('Issues created')).toBeInTheDocument();
        expect(screen.getByText('Median cycle time')).toBeInTheDocument();
        expect(screen.getByText('Issue flow')).toBeInTheDocument();
    });

    it('switches to the Cycles section with velocity and burndown', async () => {
        const { getByRole } = renderLayout();
        getByRole('button', { name: 'Cycles' }).click();
        expect(await screen.findByText('Velocity')).toBeInTheDocument();
        expect(screen.getByText('Burndown')).toBeInTheDocument();
    });

    it('v2: the rail holds the only "Analytics" heading, in the display font; section rows hover through classes', () => {
        renderLayout();
        expect(screen.getAllByRole('heading', { name: 'Analytics' })).toHaveLength(1);
        const heading = screen.getByRole('heading', { name: 'Analytics' });
        expect(heading.style.fontFamily).toBe('var(--font-display)');
        expect(heading.closest('nav')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Overview' }).style.background).toBe('var(--panel)');
        const cycles = screen.getByRole('button', { name: 'Cycles' });
        expect(cycles.className).toContain('hover:bg-hover');
        expect(cycles.style.background).toBe('');
    });

    it('v2: the header names the range, Export CSV is a Button, and the cards use display-font titles', () => {
        renderLayout();
        expect(screen.getByText('Last 7d')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Export CSV' }).className).toContain('border-border2');
        expect(screen.getByRole('link', { name: 'Back to tracker' }).className).toContain('hover:border-fg');
        expect(screen.getByText('By status').style.fontFamily).toBe('var(--font-display)');
    });
});
