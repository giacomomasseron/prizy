import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleModal } from './ScheduleModal';
import { ApiError } from '../../lib/apiClient';
import type { Schedule } from '../../lib/types';

const createMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);

vi.mock('./hooks', () => ({
    useCreateSchedule: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateSchedule: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

const SCHEDULE: Schedule = {
    id: 's1',
    name: 'Support hours',
    timezone: 'Europe/Berlin',
    intervals: [{ day_of_week: 1, opens_at: '09:00', closes_at: '17:00' }],
};

describe('ScheduleModal', () => {
    it('creates a schedule with name, timezone, and intervals', async () => {
        render(<ScheduleModal open onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Schedule name'), { target: { value: 'Weekday hours' } });
        fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'America/New_York' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create schedule' }));
        await waitFor(() =>
            expect(createMutate).toHaveBeenCalledWith({ name: 'Weekday hours', timezone: 'America/New_York', intervals: [] }),
        );
    });

    it('prefills fields when editing and calls update with the schedule id', async () => {
        render(<ScheduleModal open schedule={SCHEDULE} onClose={vi.fn()} />);
        expect(screen.getByLabelText('Schedule name')).toHaveValue('Support hours');
        expect(screen.getByLabelText('Timezone')).toHaveValue('Europe/Berlin');
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
        await waitFor(() =>
            expect(updateMutate).toHaveBeenCalledWith({
                id: 's1',
                name: 'Support hours',
                timezone: 'Europe/Berlin',
                intervals: SCHEDULE.intervals,
            }),
        );
    });

    it('includes the current timezone as an option even if not in the curated list', () => {
        render(<ScheduleModal open schedule={{ ...SCHEDULE, timezone: 'Africa/Johannesburg' }} onClose={vi.fn()} />);
        expect(screen.getByLabelText('Timezone')).toHaveValue('Africa/Johannesburg');
        expect(screen.getByRole('option', { name: 'Africa/Johannesburg' })).toBeInTheDocument();
    });

    it('shows the ApiError detail on failure and does not close', async () => {
        createMutate.mockRejectedValueOnce(new ApiError(422, 'Invalid', 'Name is required.'));
        const onClose = vi.fn();
        render(<ScheduleModal open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText('Schedule name'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create schedule' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Name is required.');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on successful submit', async () => {
        const onClose = vi.fn();
        render(<ScheduleModal open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText('Schedule name'), { target: { value: 'x' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create schedule' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
