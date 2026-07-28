import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentsSection } from './AgentsSection';
import type { AgentsReport } from '../../lib/types';

const report: AgentsReport = {
    range: '7d',
    agents: [{ id: 'a1', name: 'Maya Chen', email: 'maya@x.com', avatar_url: null, assigned: 10, solved: 8, median_first_reply_minutes: 12, median_resolution_minutes: 250, csat_pct: 91, csat_responses: 5 }],
    replies_per_day: [{ label: 'Jul 20', count: 3 }],
    csat: { responses: 5, positive_pct: 80, breakdown: [
        { key: 'positive', label: '👍 Positive', count: 4, pct: 80 },
        { key: 'negative', label: '👎 Negative', count: 1, pct: 20 },
    ] },
};

const useAgentsReport = vi.fn((_range: string, _enabled: boolean) => ({ data: report, isLoading: false }));
vi.mock('./hooks', () => ({ useAgentsReport: (r: string, e: boolean) => useAgentsReport(r, e) }));

describe('AgentsSection', () => {
    it('renders the agent table, replies chart, and satisfaction card', () => {
        render(<AgentsSection range="7d" />);
        expect(screen.getByText('Agent performance')).toBeInTheDocument();
        expect(screen.getByText('Maya Chen')).toBeInTheDocument();
        expect(screen.getByText('Replies per day')).toBeInTheDocument();
        expect(screen.getByText('Satisfaction')).toBeInTheDocument();
    });

    it('shows a loading state while data is pending', () => {
        useAgentsReport.mockReturnValueOnce({ data: undefined as unknown as AgentsReport, isLoading: true });
        render(<AgentsSection range="7d" />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
});
