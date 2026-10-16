import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
let schedulesQuery: Record<string, unknown> | null = null;

const AGENT = { id: 'me-1', admin_level: 'member', is_agent: true, is_developer: false, workspace: { helpdesk_enabled: true } };
let meData: Record<string, unknown> = AGENT;
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: meData }),
}));

vi.mock('./hooks', () => ({
    useSchedules: () => schedulesQuery ?? ({ isLoading: false, data: schedulesData }),
    useDeleteSchedule: () => ({ mutateAsync: deleteMutate }),
    useCreateSchedule: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateSchedule: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

describe('BusinessHoursSettingsPage', () => {
    describe('a viewer who is an agent (read-only)', () => {
        afterEach(() => { meData = AGENT; });

        it('sees every schedule and its hours, with no New, Edit or Delete', () => {
            meData = { ...AGENT, admin_level: 'viewer' };
            schedulesData = SCHEDULES;
            render(<BusinessHoursSettingsPage />);
            expect(screen.getByText('Weekday support')).toBeInTheDocument();
            expect(screen.getByText(/Mon–Fri 09:00–17:00/)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'New schedule' })).toBeNull();
            expect(screen.queryByTestId(`edit-${SCHEDULES[0].id}`)).toBeNull();
            expect(screen.queryByTestId(`delete-${SCHEDULES[0].id}`)).toBeNull();
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

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

    it('v2: highlighted title, pill Edit button and hover rows with a red-hover delete', () => {
        schedulesData = SCHEDULES;
        render(<BusinessHoursSettingsPage />);
        expect(screen.getByRole('heading', { level: 1, name: 'Business hours' }).querySelector('.hl')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'New schedule' }).className).toContain('bg-fg');
        expect(screen.getByTestId('edit-1').style.borderRadius).toBe('var(--radius-pill)');
        expect(screen.getByTestId('schedule-row-1').className).toContain('hover:bg-hover');
        expect(screen.getByTestId('delete-1').className).toContain('hover:text-red');
    });

    it('v2: the empty state is the dashed box', () => {
        schedulesData = [];
        render(<BusinessHoursSettingsPage />);
        expect(screen.getByText(/no schedules yet/i).style.border).toBe('var(--line) dashed var(--border2)');
        schedulesData = SCHEDULES;
    });
    it('v2: long schedule names wrap instead of painting over the row buttons', () => {
        schedulesData = SCHEDULES;
        render(<BusinessHoursSettingsPage />);
        expect(screen.getByText('Weekday support').style.overflowWrap).toBe('anywhere');
        expect(screen.getByText(/Mon–Fri 09:00–17:00/).style.overflowWrap).toBe('anywhere');
    });
    it('G3c: a failed schedules load shows the retryable alert, not the empty state', () => {
        schedulesQuery = { isLoading: false, isError: true, data: undefined, refetch: vi.fn() };
        try {
            render(<BusinessHoursSettingsPage />);
            expect(screen.getByRole('alert').textContent).toContain("Couldn't load schedules.");
            expect(screen.queryByText('No schedules yet.')).toBeNull();
        } finally {
            schedulesQuery = null;
        }
    });
});
