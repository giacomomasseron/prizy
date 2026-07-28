import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlaSection } from './SlaSection';
import type { SlaReport } from '../../lib/types';

const report: SlaReport = {
    range: '7d', attainment_pct: 94,
    by_plan: [{ policy_id: 'p1', name: 'Enterprise SLA', target_minutes: 60, attainment_pct: 97, count: 12 }],
    by_channel: [{ channel: 'email', count: 8 }, { channel: 'chat', count: 3 }, { channel: 'portal', count: 0 }, { channel: 'api', count: 1 }],
    breach_risk: [{ ticket_id: 'abcdef123456', subject: 'Seat limit error', requester_name: 'Grace', target_minutes: 60, remaining_minutes: 42, pct: 70 }],
    tags: [{ name: 'sso', count: 7 }],
};

const useSlaReport = vi.fn((_range: string, _enabled: boolean) => ({ data: report, isLoading: false }));
vi.mock('./hooks', () => ({ useSlaReport: (r: string, e: boolean) => useSlaReport(r, e) }));

describe('SlaSection', () => {
    it('renders the attainment card and the breach-risk card', () => {
        render(<SlaSection range="7d" />);
        expect(screen.getByText('SLA attainment')).toBeInTheDocument();
        expect(screen.getByText('By channel')).toBeInTheDocument();
        expect(screen.getByText('Breach risk')).toBeInTheDocument();
        expect(screen.getByText('Seat limit error')).toBeInTheDocument();
    });

    it('shows a loading state while data is pending', () => {
        useSlaReport.mockReturnValueOnce({ data: undefined as unknown as SlaReport, isLoading: true });
        render(<SlaSection range="7d" />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
});
