import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BusinessHoursSettingsPage from './BusinessHoursSettingsPage';
import type { Schedule } from '../../lib/types';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';

const deleteMutate = vi.fn().mockResolvedValue(undefined);
const createMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);

const SCHEDULES: Schedule[] = [
    {
        id: '1',
        name: 'Weekday support',
        timezone: 'America/New_York',
        intervals: [
            { day_of_week: 1, opens_at: '09:00', closes_at: '17:00' },
            { day_of_week: 2, opens_at: '09:00', closes_at: '17:00' },
            { day_of_week: 3, opens_at: '09:00', closes_at: '17:00' },
            { day_of_week: 4, opens_at: '09:00', closes_at: '17:00' },
            { day_of_week: 5, opens_at: '09:00', closes_at: '17:00' },
        ],
    },
    {
        id: '2',
        name: '24/7',
        timezone: 'UTC',
        intervals: [],
    },
];

let schedulesData: Schedule[] = SCHEDULES;

vi.mock('./hooks', () => ({
    useSchedules: () => ({ isLoading: false, data: schedulesData }),
    useDeleteSchedule: () => ({ mutateAsync: deleteMutate }),
    useCreateSchedule: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateSchedule: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

describe('BusinessHoursSettingsPage', () => {
    it('renders the schedule list with a compact open-days summary', () => {
        schedulesData = SCHEDULES;
        render(<BusinessHoursSettingsPage />);
        expect(screen.getByText('Weekday support')).toBeInTheDocument();
        expect(screen.getByText('24/7')).toBeInTheDocument();
        expect(screen.getByText(/Mon–Fri 09:00–17:00/)).toBeInTheDocument();
    });

    it('opens the create modal from the "New schedule" button', () => {
        render(<BusinessHoursSettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'New schedule' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'New schedule' })).toBeInTheDocument();
    });

    it("opens the edit modal prefilled from a row's Edit button", () => {
        render(<BusinessHoursSettingsPage />);
        fireEvent.click(screen.getByTestId('edit-1'));
        expect(screen.getByRole('heading', { name: 'Edit schedule' })).toBeInTheDocument();
        expect(screen.getByLabelText('Schedule name')).toHaveValue('Weekday support');
    });

    it('deletes a schedule only after the ConfirmDialog is confirmed', async () => {
        render(<ConfirmProvider><BusinessHoursSettingsPage /></ConfirmProvider>);
        fireEvent.click(screen.getByTestId('delete-1'));
        fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
        expect(deleteMutate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('delete-1'));
        fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('1'));
    });

    it('shows an empty state when there are no schedules', () => {
        schedulesData = [];
        render(<BusinessHoursSettingsPage />);
        expect(screen.getByText(/no schedules yet/i)).toBeInTheDocument();
        schedulesData = SCHEDULES; // restore for subsequent tests
    });
});
