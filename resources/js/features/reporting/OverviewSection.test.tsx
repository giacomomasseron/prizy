import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OverviewSection } from './OverviewSection';
import type { OverviewReport } from '../../lib/types';

const report: OverviewReport = {
    range: '7d',
    kpis: {
        tickets_created: { value: 3, delta_pct: 200 },
        solved: { value: 2, delta_pct: null },
        median_first_reply_minutes: { value: 20, delta_pct: null },
        csat: { value: null, delta_pct: null },
    },
    volume: [{ label: 'Jul 20', created: 3, solved: 2 }, { label: 'Jul 21', created: 0, solved: 0 }],
    by_status: { new: 1, open: 2, pending: 0, on_hold: 0, solved: 1, closed: 0 },
    escalations: { count: 1, created_total: 3, rate_pct: 33, recent: [{ ticket_id: 't1', subject: 'Escalated one', issue_id: 'issue-9' }] },
};

describe('OverviewSection', () => {
    it('renders the volume, status, and escalations cards from the report', () => {
        render(<MemoryRouter><OverviewSection report={report} /></MemoryRouter>);
        expect(screen.getByText('Ticket volume')).toBeInTheDocument();
        expect(screen.getByText('Tickets by status')).toBeInTheDocument();
        expect(screen.getByText('Escalated one')).toBeInTheDocument();
        expect(screen.getByText('33%', { exact: false })).toBeInTheDocument();
        // escalation links to the engineering issue
        expect(screen.getByRole('link', { name: /Escalated one/ })).toHaveAttribute('href', '/issues/issue-9');
    });
});
