import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
let policiesQuery: Record<string, unknown> | null = null;

const AGENT = { id: 'me-1', admin_level: 'member', is_agent: true, is_developer: false, workspace: { helpdesk_enabled: true } };
let meData: Record<string, unknown> = AGENT;
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: meData }),
}));

vi.mock('./hooks', () => ({
    useSlaPolicies: () => policiesQuery ?? ({ isLoading: false, data: policiesData }),
    useDeleteSlaPolicy: () => ({ mutateAsync: deleteMutate }),
    useCreateSlaPolicy: () => ({ mutateAsync: createMutate, isPending: false }),
    useUpdateSlaPolicy: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

const SCHEDULES: Schedule[] = [{ id: 'sched-1', name: 'Weekday support', timezone: 'America/New_York', intervals: [] }];

vi.mock('../business-hours/hooks', () => ({
    useSchedules: () => ({ isLoading: false, data: SCHEDULES }),
}));

describe('SlaPoliciesSettingsPage', () => {
    describe('a viewer who is an agent (read-only)', () => {
        afterEach(() => { meData = AGENT; });

        it('sees every policy and its targets, with no New, Edit or Delete', () => {
            meData = { ...AGENT, admin_level: 'viewer' };
            policiesData = POLICIES;
            render(<SlaPoliciesSettingsPage />);
            expect(screen.getByText('Priority support')).toBeInTheDocument();
            expect(screen.getByText(/First 30m/)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'New policy' })).toBeNull();
            expect(screen.queryByTestId('edit-1')).toBeNull();
            expect(screen.queryByTestId('delete-1')).toBeNull();
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

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

    it('v2: highlighted title, pill Edit button and hover rows with a red-hover delete', () => {
        policiesData = POLICIES;
        render(<SlaPoliciesSettingsPage />);
        expect(screen.getByRole('heading', { level: 1, name: 'SLA policies' }).querySelector('.hl')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'New policy' }).className).toContain('bg-fg');
        expect(screen.getByTestId('edit-1').style.borderRadius).toBe('var(--radius-pill)');
        expect(screen.getByTestId('sla-policy-row-1').className).toContain('hover:bg-hover');
        expect(screen.getByTestId('delete-1').className).toContain('hover:text-red');
    });

    it('v2: the empty state is the dashed box', () => {
        policiesData = [];
        render(<SlaPoliciesSettingsPage />);
        expect(screen.getByText(/no sla policies yet/i).style.border).toBe('var(--line) dashed var(--border2)');
        policiesData = POLICIES;
    });
    it('v2: long policy names wrap instead of painting over the row buttons', () => {
        policiesData = POLICIES;
        render(<SlaPoliciesSettingsPage />);
        expect(screen.getByText('Priority support').style.overflowWrap).toBe('anywhere');
        expect(screen.getByText(/First 30m/).style.overflowWrap).toBe('anywhere');
    });
    it('G3c: a failed policies load shows the retryable alert, not the empty state', () => {
        policiesQuery = { isLoading: false, isError: true, data: undefined, refetch: vi.fn() };
        try {
            render(<SlaPoliciesSettingsPage />);
            expect(screen.getByRole('alert').textContent).toContain("Couldn't load SLA policies.");
            expect(screen.queryByText('No SLA policies yet.')).toBeNull();
        } finally {
            policiesQuery = null;
        }
    });
});
