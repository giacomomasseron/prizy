import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
    it('renders a polyline for two or more non-null points', () => {
        const { container } = render(<Sparkline series={[1, 2, 3]} color="var(--green)" />);
        const poly = container.querySelector('polyline');
        expect(poly).not.toBeNull();
        expect(poly?.getAttribute('stroke')).toBe('var(--green)');
    });

    it('renders nothing for fewer than two non-null points', () => {
        expect(render(<Sparkline series={[null, 5]} color="red" />).container.querySelector('svg')).toBeNull();
        expect(render(<Sparkline series={[]} color="red" />).container.querySelector('svg')).toBeNull();
        expect(render(<Sparkline series={[null, null]} color="red" />).container.querySelector('svg')).toBeNull();
    });

    it('renders a valid polyline for a flat series (all equal)', () => {
        const poly = render(<Sparkline series={[5, 5, 5]} color="red" />).container.querySelector('polyline');
        expect(poly).not.toBeNull();
        expect(poly?.getAttribute('points')?.length).toBeGreaterThan(0);
    });
});
