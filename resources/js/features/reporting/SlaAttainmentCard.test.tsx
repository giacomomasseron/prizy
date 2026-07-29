import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SlaAttainmentCard } from './SlaAttainmentCard';
import type { SlaReport } from '../../lib/types';

const report = (over: Partial<SlaReport> = {}): SlaReport => ({
    range: '7d', attainment_pct: 94, resolution_attainment_pct: 94,
    by_plan: [{ policy_id: 'p1', name: 'Enterprise SLA', target_minutes: 60, attainment_pct: 97, count: 12 }],
    by_channel: [
        { channel: 'email', count: 8 }, { channel: 'chat', count: 3 },
        { channel: 'portal', count: 0 }, { channel: 'api', count: 1 },
    ],
    breach_risk: [], tags: [], ...over,
});

describe('SlaAttainmentCard', () => {
    it('renders the attainment %, a plan row, and channel labels', () => {
        render(<SlaAttainmentCard report={report()} />);
        expect(screen.getByText('94%')).toBeInTheDocument();
        expect(screen.getByText('Enterprise SLA · 1h')).toBeInTheDocument();
        expect(screen.getByText('97%')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('renders a dash when attainment is null', () => {
        render(<SlaAttainmentCard report={report({ attainment_pct: null, by_plan: [] })} />);
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('renders the resolution attainment stat, and a dash when null', () => {
        render(<SlaAttainmentCard report={report({ resolution_attainment_pct: 88 })} />);
        expect(screen.getByText('Resolution')).toBeInTheDocument();
        expect(screen.getByText('88% met')).toBeInTheDocument();
        cleanup();
        render(<SlaAttainmentCard report={report({ resolution_attainment_pct: null })} />);
        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
