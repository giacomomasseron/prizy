import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SatisfactionCard } from './SatisfactionCard';

describe('SatisfactionCard', () => {
    it('renders the two breakdown rows and the response count', () => {
        render(<SatisfactionCard csat={{ responses: 4, positive_pct: 75, breakdown: [
            { key: 'positive', label: '👍 Positive', count: 3, pct: 75 },
            { key: 'negative', label: '👎 Negative', count: 1, pct: 25 },
        ] }} />);
        expect(screen.getByText('4 rated conversations')).toBeInTheDocument();
        expect(screen.getByText('👍 Positive')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('renders an empty state when there are no ratings', () => {
        render(<SatisfactionCard csat={{ responses: 0, positive_pct: null, breakdown: [
            { key: 'positive', label: '👍 Positive', count: 0, pct: 0 },
            { key: 'negative', label: '👎 Negative', count: 0, pct: 0 },
        ] }} />);
        expect(screen.getByText(/no ratings/i)).toBeInTheDocument();
    });
});
