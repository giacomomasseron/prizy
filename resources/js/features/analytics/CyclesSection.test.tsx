import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CyclesSection } from './CyclesSection';

const useTeamsMock = vi.fn();

vi.mock('../teams/hooks', () => ({
    useTeams: () => useTeamsMock(),
}));
vi.mock('./hooks', () => ({
    useCycleReport: () => ({ data: undefined, isLoading: false }),
}));

describe('CyclesSection', () => {
    it('shows a loading state while teams are being fetched', () => {
        useTeamsMock.mockReturnValue({ data: undefined, isLoading: true });
        render(<CyclesSection />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        expect(screen.queryByText('Join a team to see cycle analytics.')).not.toBeInTheDocument();
    });

    it('shows the join-a-team empty state once loaded with zero teams', () => {
        useTeamsMock.mockReturnValue({ data: { items: [] }, isLoading: false });
        render(<CyclesSection />);
        expect(screen.getByText('Join a team to see cycle analytics.')).toBeInTheDocument();
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });
});
