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

    it('renders a neutral badge (not red/green) for a 0% delta', () => {
        render(<KpiCard meta={{ key: 'tickets_created', label: 'Tickets created', unit: '', positiveIsGood: true }} kpi={{ value: 5, delta_pct: 0 }} />);
        const badge = screen.getByText('0%');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle({ color: 'var(--fg3)' });
        expect(badge.style.color).not.toBe('var(--green)');
        expect(badge.style.color).not.toBe('var(--red)');
    });

    it('renders a sparkline when a plottable series is provided', () => {
        const { container } = render(<KpiCard meta={{ key: 'solved', label: 'Solved', unit: '', positiveIsGood: true }} kpi={{ value: 71, delta_pct: 14 }} series={[1, 2, 3]} />);
        expect(container.querySelector('polyline')).not.toBeNull();
    });

    it('renders no sparkline when series is omitted', () => {
        const { container } = render(<KpiCard meta={{ key: 'solved', label: 'Solved', unit: '', positiveIsGood: true }} kpi={{ value: 71, delta_pct: 14 }} />);
        expect(container.querySelector('svg')).toBeNull();
    });

    it('colors the sparkline neutral (not red) when the delta is null', () => {
        const { container } = render(<KpiCard meta={{ key: 'csat', label: 'CSAT', unit: '%', positiveIsGood: true }} kpi={{ value: 80, delta_pct: null }} series={[1, 2, 3]} />);
        const poly = container.querySelector('polyline');
        expect(poly).not.toBeNull();
        expect(poly?.getAttribute('stroke')).toBe('var(--fg3)');
    });

    it('v2: card frame, sentence-case label, display-font value and a token-tinted delta', () => {
        render(<KpiCard meta={{ key: 'solved', label: 'Solved', unit: '', positiveIsGood: true }} kpi={{ value: 71, delta_pct: 14 }} />);
        expect(screen.getByText('71').style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByText('+14%').style.background).toBe('color-mix(in srgb, var(--green) 14%, transparent)');
        expect(screen.getByText('+14%').style.borderRadius).toBe('var(--radius-pill)');
        const label = screen.getByText('Solved');
        expect(label.style.fontWeight).toBe('700');
        expect((label.parentElement?.parentElement as HTMLElement).style.borderRadius).toBe('var(--radius-card)');
    });

    it('v2: a bad delta tints from the red token', () => {
        render(<KpiCard meta={{ key: 'solved', label: 'Solved', unit: '', positiveIsGood: true }} kpi={{ value: 71, delta_pct: -9 }} />);
        expect(screen.getByText('-9%').style.background).toBe('color-mix(in srgb, var(--red) 14%, transparent)');
    });
});
