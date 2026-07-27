import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketList } from './TicketList';
import type { TicketListItem } from '../../lib/types';

function t(over: Partial<TicketListItem>): TicketListItem {
    return { id: 'x', subject: 's', status: 'open', priority: 'normal', channel: 'email', requester: null, assignee: null, tags: [], linked_issues: [], sla: { policy_name: null, target_minutes: null, due_at: null, state: 'none' }, updated_at: '', created_at: '', first_replied_at: null, resolved_at: null, ...over };
}

const tickets: TicketListItem[] = [
    t({ id: 'a', subject: 'Cannot log in', status: 'open' }),
    t({ id: 'b', subject: 'Billing question', status: 'pending', linked_issues: [{ id: 'issue-1', identifier: 'PRJ-42', title: 'Fix login' }] }),
];

describe('TicketList', () => {
    it('renders a row per ticket with its subject and status badge', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} />);
        expect(screen.getAllByTestId('ticket-row')).toHaveLength(2);
        expect(screen.getByText('Cannot log in')).toBeInTheDocument();
        expect(screen.getByText('Billing question')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders a linked-issue badge only for tickets with linked_issues', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} />);
        expect(screen.getByText('↩ PRJ-42')).toBeInTheDocument();
    });

    it('renders the empty state when there are no tickets', () => {
        render(<TicketList tickets={[]} selectedId={undefined} onSelect={vi.fn()} />);
        expect(screen.getByText('No tickets in this view.')).toBeInTheDocument();
        expect(screen.queryByTestId('ticket-row')).not.toBeInTheDocument();
    });

    it('calls onSelect with the clicked ticket id', () => {
        const onSelect = vi.fn();
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={onSelect} />);
        fireEvent.click(screen.getByText('Cannot log in'));
        expect(onSelect).toHaveBeenCalledWith('a');
    });

    it('renders an SLA countdown for a due ticket and a dash for none', () => {
        const rows = [
            t({ id: 'due', subject: 'Due one', created_at: new Date(Date.now() - 40 * 60000).toISOString(), sla: { policy_name: 'Std', target_minutes: 60, due_at: new Date(Date.now() + 20 * 60000).toISOString(), state: 'due' } }),
            t({ id: 'none', subject: 'No sla' }),
        ];
        render(<TicketList tickets={rows} selectedId={undefined} onSelect={vi.fn()} />);
        expect(screen.getByText(/^\d+m$|^\dh/)).toBeInTheDocument(); // e.g. "20m"
        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
