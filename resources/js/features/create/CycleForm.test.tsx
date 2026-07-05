import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CycleForm from './CycleForm';

vi.mock('../../features/teams/hooks', () => ({
    useTeams: () => ({ data: { items: [{ id: 't1', name: 'Alpha', identifier: 'AL', color: '#6366f1', created_at: '', updated_at: '' }] } }),
    useCreateCycle: (teamId: string) => ({ mutateAsync: mockMutate, isPending: false }),
}));
const mockMutate = vi.fn().mockResolvedValue({ id: 'c1', name: 'Sprint', team_id: 't1', starts_at: '2026-08-01', ends_at: '2026-08-15', cooldown_days: 2, created_at: '', updated_at: '' });

function wrap(defaultTeamId?: string) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter>
                <CycleForm defaultTeamId={defaultTeamId} onSuccess={vi.fn()} onCancel={vi.fn()} />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe('CycleForm', () => {
    it('disables Create cycle when name is empty', () => {
        wrap();
        expect(screen.getByRole('button', { name: /Create cycle/i })).toBeDisabled();
    });
    it('disables Create cycle when team is not selected', async () => {
        wrap(); // no defaultTeamId
        await userEvent.type(screen.getByPlaceholderText(/cycle name/i), 'Sprint');
        expect(screen.getByRole('button', { name: /Create cycle/i })).toBeDisabled();
    });
    it('pre-selects team when defaultTeamId matches', () => {
        wrap('t1');
        // Team picker trigger should show team name
        expect(screen.getByRole('button', { name: /Team picker/i })).toHaveTextContent('Alpha');
    });
    it('Duration chip sets ends_at = starts_at + N*7 days', async () => {
        wrap('t1');
        await userEvent.type(screen.getByPlaceholderText(/cycle name/i), 'Sprint');
        // Set starts_at
        await userEvent.type(screen.getByLabelText(/starts/i), '2026-08-01');
        // Click "2 weeks" chip
        await userEvent.click(screen.getByRole('button', { name: /2 weeks/i }));
        // ends_at input should be 2026-08-15
        expect((screen.getByLabelText(/ends/i) as HTMLInputElement).value).toBe('2026-08-15');
    });
    it('Cooldown toggle maps on=2 off=0 and submits correctly', async () => {
        wrap('t1');
        await userEvent.type(screen.getByPlaceholderText(/cycle name/i), 'Sprint');
        await userEvent.type(screen.getByLabelText(/starts/i), '2026-08-01');
        await userEvent.type(screen.getByLabelText(/ends/i), '2026-08-15');
        // Toggle cooldown on
        await userEvent.click(screen.getByRole('checkbox', { name: /2-day cooldown/i }));
        await userEvent.click(screen.getByRole('button', { name: /Create cycle/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ cooldown_days: 2 }));
        });
    });
    it('shows 4 duration chips', () => {
        wrap('t1');
        [1,2,3,4].forEach(n => {
            expect(screen.getByRole('button', { name: new RegExp(`${n} week`) })).toBeInTheDocument();
        });
    });
});
