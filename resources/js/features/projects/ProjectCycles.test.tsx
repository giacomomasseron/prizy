import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectCycles from './ProjectCycles';

describe('ProjectCycles', () => {
    it('renders the coming-soon message', () => {
        render(<ProjectCycles />);
        expect(screen.getByText('Project cycles are coming soon')).toBeInTheDocument();
        expect(screen.getByText('Cycles are currently organized by team.')).toBeInTheDocument();
    });
    it('v2: a highlighted "Cycles" title above the dashed placeholder card', () => {
        render(<ProjectCycles />);
        expect(screen.getByRole('heading', { level: 1, name: 'Cycles' }).querySelector('span.hl')).not.toBeNull();
        const card = screen.getByText('Project cycles are coming soon').parentElement as HTMLElement;
        expect(card.style.border).toBe('var(--line) dashed var(--border2)');
    });
});
