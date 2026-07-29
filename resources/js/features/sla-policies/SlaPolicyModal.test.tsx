import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlaPolicyModal } from './SlaPolicyModal';
import { ApiError } from '../../lib/apiClient';
import type { Schedule, SlaPolicy } from '../../lib/types';

const createMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);

vi.mock('./hooks', () => ({
    useCreateSlaPolicy: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateSlaPolicy: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

const SCHEDULES: Schedule[] = [
    { id: 'sched-1', name: 'Weekday support', timezone: 'America/New_York', intervals: [] },
    { id: 'sched-2', name: '24/7', timezone: 'UTC', intervals: [] },
];

vi.mock('../business-hours/hooks', () => ({
    useSchedules: () => ({ isLoading: false, data: SCHEDULES }),
}));

const POLICY: SlaPolicy = {
    id: 'p1',
    name: 'Priority support',
    first_reply_minutes: 30,
    next_reply_minutes: 60,
    resolution_minutes: 480,
    schedule_id: 'sched-1',
    schedule_name: 'Weekday support',
};

describe('SlaPolicyModal', () => {
    it('creates a policy with null next-reply and null schedule by default', async () => {
        render(<SlaPolicyModal open onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'Standard' } });
        fireEvent.change(screen.getByLabelText('First reply minutes'), { target: { value: '15' } });
        fireEvent.change(screen.getByLabelText('Resolution minutes'), { target: { value: '240' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
        await waitFor(() =>
            expect(createMutate).toHaveBeenCalledWith({
                name: 'Standard',
                first_reply_minutes: 15,
                next_reply_minutes: null,
                resolution_minutes: 240,
                schedule_id: null,
            }),
        );
    });

    it('creates a policy with a next-reply target and a chosen schedule', async () => {
        render(<SlaPolicyModal open onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'Standard' } });
        fireEvent.change(screen.getByLabelText('First reply minutes'), { target: { value: '15' } });
        fireEvent.change(screen.getByLabelText('Next reply minutes'), { target: { value: '45' } });
        fireEvent.change(screen.getByLabelText('Resolution minutes'), { target: { value: '240' } });
        fireEvent.change(screen.getByLabelText('Schedule'), { target: { value: 'sched-2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
        await waitFor(() =>
            expect(createMutate).toHaveBeenCalledWith({
                name: 'Standard',
                first_reply_minutes: 15,
                next_reply_minutes: 45,
                resolution_minutes: 240,
                schedule_id: 'sched-2',
            }),
        );
    });

    it('lists the "24/7 (no schedule)" option plus every useSchedules result', () => {
        render(<SlaPolicyModal open onClose={vi.fn()} />);
        expect(screen.getByRole('option', { name: '24/7 (no schedule)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Weekday support' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '24/7' })).toBeInTheDocument();
    });

    it('prefills fields when editing and calls update with the policy id', async () => {
        render(<SlaPolicyModal open policy={POLICY} onClose={vi.fn()} />);
        expect(screen.getByLabelText('Policy name')).toHaveValue('Priority support');
        expect(screen.getByLabelText('First reply minutes')).toHaveValue(30);
        expect(screen.getByLabelText('Next reply minutes')).toHaveValue(60);
        expect(screen.getByLabelText('Resolution minutes')).toHaveValue(480);
        expect(screen.getByLabelText('Schedule')).toHaveValue('sched-1');
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
        await waitFor(() =>
            expect(updateMutate).toHaveBeenCalledWith({
                id: 'p1',
                name: 'Priority support',
                first_reply_minutes: 30,
                next_reply_minutes: 60,
                resolution_minutes: 480,
                schedule_id: 'sched-1',
            }),
        );
    });

    it('shows the ApiError detail on failure and does not close', async () => {
        createMutate.mockRejectedValueOnce(new ApiError(422, 'Invalid', 'Name is required.'));
        const onClose = vi.fn();
        render(<SlaPolicyModal open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'x' } });
        fireEvent.change(screen.getByLabelText('First reply minutes'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Resolution minutes'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Name is required.');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes on successful submit', async () => {
        const onClose = vi.fn();
        render(<SlaPolicyModal open onClose={onClose} />);
        fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'x' } });
        fireEvent.change(screen.getByLabelText('First reply minutes'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Resolution minutes'), { target: { value: '10' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create policy' }));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
});
