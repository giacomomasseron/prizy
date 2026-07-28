import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportingLayout from './ReportingLayout';
import type { AgentsReport, OverviewReport, SlaReport } from '../../lib/types';

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

const agentsReport: AgentsReport = {
    range: '7d',
    agents: [{ id: 'a1', name: 'Maya Chen', email: 'maya@x.com', avatar_url: null, assigned: 10, solved: 8, median_first_reply_minutes: 12, median_resolution_minutes: 250, csat_pct: 91, csat_responses: 5 }],
    replies_per_day: [{ label: 'Jul 20', count: 3 }],
    csat: { responses: 5, positive_pct: 80, breakdown: [
        { key: 'positive', label: '👍 Positive', count: 4, pct: 80 },
        { key: 'negative', label: '👎 Negative', count: 1, pct: 20 },
    ] },
};

const slaReport: SlaReport = {
    range: '7d', attainment_pct: 94,
    by_plan: [{ policy_id: 'p1', name: 'Enterprise SLA', target_minutes: 60, attainment_pct: 97, count: 12 }],
    by_channel: [{ channel: 'email', count: 8 }, { channel: 'chat', count: 3 }, { channel: 'portal', count: 0 }, { channel: 'api', count: 1 }],
    breach_risk: [], tags: [],
};

const useOverviewReport = vi.fn((_range: string) => ({ data: report, isLoading: false }));
const useAgentsReport = vi.fn((_range: string, _enabled: boolean) => ({ data: agentsReport, isLoading: false }));
const useSlaReport = vi.fn((_range: string, _enabled: boolean) => ({ data: slaReport, isLoading: false }));
vi.mock('./hooks', () => ({
    useOverviewReport: (r: string) => useOverviewReport(r),
    useAgentsReport: (r: string, e: boolean) => useAgentsReport(r, e),
    useSlaReport: (r: string, e: boolean) => useSlaReport(r, e),
}));
vi.mock('../../auth/useAuth', () => ({ useMe: () => ({ data: { id: 'u1', name: 'Me' } }) }));

describe('ReportingLayout', () => {
    it('renders the KPI cards and the Overview section', () => {
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        expect(screen.getByText('Tickets created')).toBeInTheDocument();
        expect(screen.getByText('84')).toBeInTheDocument();
        expect(screen.getByText('Ticket volume')).toBeInTheDocument();
    });

    it('renders the Agents section (agent table) when Agents is selected', () => {
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        fireEvent.click(screen.getByText('Agents & CSAT'));
        expect(screen.getByText('Agent performance')).toBeInTheDocument();
    });

    it('renders the SLA section when SLA & channels is selected', () => {
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        fireEvent.click(screen.getByText('SLA & channels'));
        expect(screen.getByText('SLA attainment')).toBeInTheDocument();
    });

    it('refetches when the range toggles to 30d', () => {
        useOverviewReport.mockClear();
        render(<MemoryRouter><ReportingLayout /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: '30d' }));
        expect(useOverviewReport).toHaveBeenCalledWith('30d');
    });
});
