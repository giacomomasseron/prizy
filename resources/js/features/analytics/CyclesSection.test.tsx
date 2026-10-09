import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CyclesSection } from './CyclesSection';

const useTeamsMock = vi.fn();

vi.mock('../teams/hooks', () => ({
    useTeams: () => useTeamsMock(),
}));
const useCycleReportMock = vi.fn();
vi.mock('./hooks', () => ({
    useCycleReport: () => useCycleReportMock(),
}));
beforeEach(() => { useCycleReportMock.mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }); });

describe('CyclesSection', () => {
    it('shows a loading state while teams are being fetched', () => {
        useTeamsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
        render(<CyclesSection />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
        expect(screen.queryByText('Join a team to see cycle analytics.')).not.toBeInTheDocument();
    });

    it('shows the join-a-team empty state once loaded with zero teams', () => {
        useTeamsMock.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false, refetch: vi.fn() });
        render(<CyclesSection />);
        expect(screen.getByText('Join a team to see cycle analytics.')).toBeInTheDocument();
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    });

    it('v2: the team picker is a pill field', () => {
        useTeamsMock.mockReturnValue({ data: { items: [{ id: 't1', name: 'Smoke Team' }] }, isLoading: false, isError: false, refetch: vi.fn() });
        render(<CyclesSection />);
        expect(screen.getByLabelText('Team').className).toContain('focus:border-fg');
    });

    it('G3c: a failed teams load says so instead of "Join a team"', () => {
        useTeamsMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
        render(<CyclesSection />);
        expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your teams.");
        expect(screen.queryByText('Join a team to see cycle analytics.')).toBeNull();
    });

    it('G3c: a failed cycle report shows a retryable alert under the picker', () => {
        useTeamsMock.mockReturnValue({ data: { items: [{ id: 't1', name: 'Smoke Team' }] }, isLoading: false, isError: false, refetch: vi.fn() });
        useCycleReportMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
        render(<CyclesSection />);
        expect(screen.getByLabelText('Team')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load cycle analytics.");
    });
});
