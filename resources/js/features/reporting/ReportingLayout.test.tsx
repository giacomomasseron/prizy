import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportingLayout from './ReportingLayout';
import type { OverviewReport } from '../../lib/types';

const report: OverviewReport = {
    range: '7d',
    kpis: {
        tickets_created: { value: 84, delta_pct: 9 },
        solved: { value: 71, delta_pct: 14 },
        median_first_reply_minutes: { value: 14, delta_pct: -22 },
        csat: { value: null, delta_pct: null },
    },
    volume: [{ label: 'Jul 20', created: 3, solved: 2 }],
    by_status: { new: 1, open: 2, pending: 0, on_hold: 0, solved: 1, closed: 0 },
    escalations: { count: 1, created_total: 3, rate_pct: 33, recent: [] },
};

const useOverviewReport = vi.fn((_range: string) => ({ data: report, isLoading: false }));
vi.mock('./hooks', () => ({ useOverviewReport: (r: string) => useOverviewReport(r) }));
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', name: 'Me' } }) }));

describe('ReportingLayout', () => {
    it('renders the KPI cards and the Overview section', () => {
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        expect(screen.getByText('Tickets created')).toBeInTheDocument();
        expect(screen.getByText('84')).toBeInTheDocument();
        expect(screen.getByText('Ticket volume')).toBeInTheDocument();
    });

    it('shows the coming-soon placeholder for the Agents section', () => {
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        fireEvent.click(screen.getByText('Agents & CSAT'));
        expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });

    it('refetches when the range toggles to 30d', () => {
        useOverviewReport.mockClear();
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: '30d' }));
        expect(useOverviewReport).toHaveBeenCalledWith('30d');
    });
});
