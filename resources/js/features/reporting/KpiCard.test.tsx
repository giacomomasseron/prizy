import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
    it('renders value, unit, and a coloured delta badge', () => {
        render(<KpiCard meta={{ key: 'solved', label: 'Solved', unit: '', positiveIsGood: true }} kpi={{ value: 71, delta_pct: 14 }} />);
        expect(screen.getByText('71')).toBeInTheDocument();
        expect(screen.getByText('+14%')).toBeInTheDocument();
    });

    it('renders a dash and no badge when the value is null', () => {
        render(<KpiCard meta={{ key: 'csat', label: 'CSAT', unit: '%', positiveIsGood: true }} kpi={{ value: null, delta_pct: null }} />);
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    });

    it('omits the badge when delta is null but shows the value', () => {
        render(<KpiCard meta={{ key: 'tickets_created', label: 'Tickets created', unit: '', positiveIsGood: true }} kpi={{ value: 5, delta_pct: null }} />);
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
});
