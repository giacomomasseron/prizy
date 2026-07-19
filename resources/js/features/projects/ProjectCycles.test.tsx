import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProjectCycles from './ProjectCycles';

describe('ProjectCycles', () => {
    it('renders the coming-soon message', () => {
        render(<ProjectCycles />);
        expect(screen.getByText('Project cycles are coming soon')).toBeInTheDocument();
        expect(screen.getByText('Cycles are currently organized by team.')).toBeInTheDocument();
    });
});
