import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VelocityTable } from './VelocityTable';

const row = { id: 'c1', name: 'Cycle 1', starts_at: '2026-09-01', ends_at: '2026-09-14', completed_count: 8, total_count: 10 };

describe('VelocityTable', () => {
    it('renders cycle rows with completion ratio and percent', () => {
        render(<VelocityTable rows={[row]} selectedId="c1" onSelect={vi.fn()} />);
        expect(screen.getByText('Velocity')).toBeInTheDocument();
        expect(screen.getByText('Cycle 1')).toBeInTheDocument();
        expect(screen.getByText('8/10')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('shows an empty state without rows', () => {
        render(<VelocityTable rows={[]} selectedId={null} onSelect={vi.fn()} />);
        expect(screen.getByText('No cycles yet')).toBeInTheDocument();
    });
});
