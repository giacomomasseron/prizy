import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepliesPerDayChart } from './RepliesPerDayChart';

describe('RepliesPerDayChart', () => {
    it('renders the title and a label per bucket', () => {
        render(<RepliesPerDayChart buckets={[{ label: 'Jul 20', count: 3 }, { label: 'Jul 21', count: 5 }]} />);
        expect(screen.getByText('Replies per day')).toBeInTheDocument();
        expect(screen.getByText('Jul 20')).toBeInTheDocument();
        expect(screen.getByText('Jul 21')).toBeInTheDocument();
    });
});
