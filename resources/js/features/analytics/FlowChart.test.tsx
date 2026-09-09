import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowChart } from './FlowChart';

describe('FlowChart', () => {
    it('renders title, legend, and one column per bucket', () => {
        render(<FlowChart flow={{ labels: ['Sep 1', 'Sep 2'], created: [3, 1], completed: [1, 2] }} />);
        expect(screen.getByText('Issue flow')).toBeInTheDocument();
        expect(screen.getByText('Created')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByTitle('Sep 1 · 3 created, 1 completed')).toBeInTheDocument();
    });
});
