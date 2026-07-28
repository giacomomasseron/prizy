import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentPerformanceTable } from './AgentPerformanceTable';
import type { AgentRow } from '../../lib/types';

const row = (over: Partial<AgentRow>): AgentRow => ({
    id: 'a1', name: 'Maya Chen', email: 'maya@x.com', avatar_url: null,
    assigned: 10, solved: 8, median_first_reply_minutes: 12, median_resolution_minutes: 250, csat_pct: 91, csat_responses: 5, ...over,
});

describe('AgentPerformanceTable', () => {
    it('renders a row per agent with formatted durations and CSAT', () => {
        render(<AgentPerformanceTable agents={[row({}), row({ id: 'a2', name: 'Sara Ito', email: 's@x.com', median_first_reply_minutes: 30, median_resolution_minutes: 500, csat_pct: 80 })]} />);
        expect(screen.getByText('Maya Chen')).toBeInTheDocument();
        expect(screen.getByText('maya@x.com')).toBeInTheDocument();
        expect(screen.getByText('12m')).toBeInTheDocument();
        expect(screen.getByText('4h 10m')).toBeInTheDocument();
        expect(screen.getByText('91%')).toBeInTheDocument();
    });

    it('renders a dash for null median and CSAT values', () => {
        render(<AgentPerformanceTable agents={[row({ median_first_reply_minutes: null, median_resolution_minutes: null, csat_pct: null })]} />);
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    });

    it('renders an empty-state row when there are no agents', () => {
        render(<AgentPerformanceTable agents={[]} />);
        expect(screen.getByText(/no agent activity/i)).toBeInTheDocument();
    });
});
