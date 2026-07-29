import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SlaPoliciesSettingsPage from './SlaPoliciesSettingsPage';
import type { Schedule, SlaPolicy } from '../../lib/types';
import { ConfirmProvider } from '../../components/ui/ConfirmProvider';

const deleteMutate = vi.fn().mockResolvedValue(undefined);
const createMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);

const POLICIES: SlaPolicy[] = [
    {
        id: '1',
        name: 'Priority support',
        first_reply_minutes: 30,
        next_reply_minutes: 60,
        resolution_minutes: 480,
        schedule_id: 'sched-1',
        schedule_name: 'Weekday support',
    },
    {
        id: '2',
        name: 'Standard',
        first_reply_minutes: 120,
        next_reply_minutes: null,
        resolution_minutes: 1440,
        schedule_id: null,
        schedule_name: null,
    },
];

let policiesData: SlaPolicy[] = POLICIES;

vi.mock('./hooks', () => ({
    useSlaPolicies: () => ({ isLoading: false, data: policiesData }),
    useDeleteSlaPolicy: () => ({ mutateAsync: deleteMutate }),
    useCreateSlaPolicy: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateSlaPolicy: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

const SCHEDULES: Schedule[] = [{ id: 'sched-1', name: 'Weekday support', timezone: 'America/New_York', intervals: [] }];

vi.mock('../business-hours/hooks', () => ({
    useSchedules: () => ({ isLoading: false, data: SCHEDULES }),
}));

describe('SlaPoliciesSettingsPage', () => {
    it('renders the policy list with the targets summary and schedule name', () => {
        policiesData = POLICIES;
        render(<SlaPoliciesSettingsPage />);
        expect(screen.getByText('Priority support')).toBeInTheDocument();
        expect(screen.getByText(/First 30m/)).toBeInTheDocument();
        expect(screen.getByText(/Next 60/)).toBeInTheDocument();
        expect(screen.getByText(/Resolution 480m/)).toBeInTheDocument();
        expect(screen.getByText(/Weekday support/)).toBeInTheDocument();

        expect(screen.getByText('Standard')).toBeInTheDocument();
        expect(screen.getByText(/Next —/)).toBeInTheDocument();
        expect(screen.getByText(/24\/7/)).toBeInTheDocument();
    });

    it('opens the create modal from the "New policy" button', () => {
        render(<SlaPoliciesSettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'New policy' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'New SLA policy' })).toBeInTheDocument();
    });

    it("opens the edit modal prefilled from a row's Edit button", () => {
        render(<SlaPoliciesSettingsPage />);
        fireEvent.click(screen.getByTestId('edit-1'));
        expect(screen.getByRole('heading', { name: 'Edit SLA policy' })).toBeInTheDocument();
        expect(screen.getByLabelText('Policy name')).toHaveValue('Priority support');
    });

    it('deletes a policy only after the ConfirmDialog is confirmed', async () => {
        render(<ConfirmProvider><SlaPoliciesSettingsPage /></ConfirmProvider>);
        fireEvent.click(screen.getByTestId('delete-1'));
        fireEvent.click(await screen.findByTestId('confirm-dialog-cancel'));
        expect(deleteMutate).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('delete-1'));
        fireEvent.click(await screen.findByTestId('confirm-dialog-confirm'));
        await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('1'));
    });

    it('shows an empty state when there are no policies', () => {
        policiesData = [];
        render(<SlaPoliciesSettingsPage />);
        expect(screen.getByText(/no sla policies yet/i)).toBeInTheDocument();
        policiesData = POLICIES; // restore for subsequent tests
    });
});
