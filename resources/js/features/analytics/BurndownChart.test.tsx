import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BurndownChart } from './BurndownChart';

const burndown = {
    cycle_id: 'c1', name: 'Cycle 1', starts_at: '2026-09-01', ends_at: '2026-09-04', total_scope: 4,
    days: [
        { date: '2026-09-01', remaining: 4 },
        { date: '2026-09-02', remaining: 2 },
        { date: '2026-09-03', remaining: null },
        { date: '2026-09-04', remaining: null },
    ],
};

describe('BurndownChart', () => {
    it('renders the title, cycle name and an svg with the actual polyline', () => {
        const { container } = render(<BurndownChart burndown={burndown} />);
        expect(screen.getByText('Burndown')).toBeInTheDocument();
        expect(screen.getByText('Cycle 1')).toBeInTheDocument();
        const polylines = container.querySelectorAll('polyline');
        expect(polylines.length).toBe(2); // ideal + actual
        // actual line only spans the 2 non-null days
        expect(polylines[1].getAttribute('points')!.trim().split(' ').length).toBe(2);
    });
});
