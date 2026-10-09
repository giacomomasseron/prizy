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

    it('v2: display-font title; the selected row is tinted with a ring and unselected rows hover through classes', () => {
        render(<VelocityTable rows={[row, { ...row, id: 'c2', name: 'Cycle 2' }]} selectedId="c1" onSelect={vi.fn()} />);
        expect(screen.getByText('Velocity').style.fontFamily).toBe('var(--font-display)');
        const [selected, other] = screen.getAllByRole('button');
        expect(selected).toHaveAttribute('aria-pressed', 'true');
        expect(selected.style.boxShadow).toBe('inset 0 0 0 1.5px var(--border2)');
        expect(other.className).toContain('hover:bg-hover');
        expect(other.style.background).toBe('');
    });

    it('G3a: a good completion rate is written in the green ink partner', () => {
        render(<VelocityTable rows={[row]} selectedId="c1" onSelect={vi.fn()} />);
        expect(screen.getByText('80%').style.color).toBe('var(--green-ink)');
    });
});
