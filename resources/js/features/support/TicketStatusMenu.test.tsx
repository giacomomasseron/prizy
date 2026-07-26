import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketStatusMenu } from './TicketStatusMenu';
import type { TicketDetail } from '../../lib/types';

const changeMutate = vi.fn();

vi.mock('./hooks', () => ({
    useChangeTicketStatus: () => ({ mutate: changeMutate, isPending: false }),
}));

function ticket(over: Partial<TicketDetail> = {}): TicketDetail {
    return {
        id: 't1', subject: 'S', status: 'open', priority: 'normal', channel: 'email',
        requester: null, assignee: null, tags: [], linked_issues: [],
        sla: { policy_name: null, breached: false }, updated_at: '', created_at: '',
        first_replied_at: null, resolved_at: null, messages: [], requester_history: [], ...over,
    };
}

beforeEach(() => changeMutate.mockReset());

describe('TicketStatusMenu', () => {
    it('shows the current status on the trigger', () => {
        render(<TicketStatusMenu ticket={ticket({ status: 'open' })} />);
        expect(screen.getByRole('button', { name: /Status: Open/ })).toBeInTheDocument();
    });

    it('lists all six statuses and changes to the chosen one', () => {
        render(<TicketStatusMenu ticket={ticket({ status: 'open' })} />);
        fireEvent.click(screen.getByRole('button', { name: /Status: Open/ }));
        expect(screen.getAllByRole('menuitem')).toHaveLength(6);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Solved' }));
        expect(changeMutate).toHaveBeenCalledWith('solved');
    });
});
