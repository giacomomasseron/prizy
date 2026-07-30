import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketList } from './TicketList';
import type { TicketListItem } from '../../lib/types';

function t(over: Partial<TicketListItem>): TicketListItem {
    return { id: 'x', subject: 's', status: 'open', priority: 'normal', channel: 'email', requester: null, assignee: null, tags: [], linked_issues: [], sla_metrics: [], updated_at: '', created_at: '', first_replied_at: null, resolved_at: null, ...over };
}

function baseProps() {
    return { sort: 'updated_at', onSortChange: vi.fn(), hasMore: false, onLoadMore: vi.fn(), loadingMore: false };
}

const tickets: TicketListItem[] = [
    t({ id: 'a', subject: 'Cannot log in', status: 'open' }),
    t({ id: 'b', subject: 'Billing question', status: 'pending', linked_issues: [{ id: 'issue-1', identifier: 'PRJ-42', title: 'Fix login' }] }),
];

describe('TicketList', () => {
    it('renders a row per ticket with its subject and status badge', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        expect(screen.getAllByTestId('ticket-row')).toHaveLength(2);
        expect(screen.getByText('Cannot log in')).toBeInTheDocument();
        expect(screen.getByText('Billing question')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders a linked-issue badge only for tickets with linked_issues', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        expect(screen.getByText('↩ PRJ-42')).toBeInTheDocument();
    });

    it('renders the empty state when there are no tickets', () => {
        render(<TicketList tickets={[]} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        expect(screen.getByText('No tickets in this view.')).toBeInTheDocument();
        expect(screen.queryByTestId('ticket-row')).not.toBeInTheDocument();
    });

    it('calls onSelect with the clicked ticket id', () => {
        const onSelect = vi.fn();
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={onSelect} {...baseProps()} />);
        fireEvent.click(screen.getByText('Cannot log in'));
        expect(onSelect).toHaveBeenCalledWith('a');
    });

    it('renders an SLA countdown for a due ticket and a dash for none', () => {
        const rows = [
            t({ id: 'due', subject: 'Due one', sla_metrics: [{ metric: 'first_reply', policy_name: 'Std', target_minutes: 60, due_at: new Date(Date.now() + 20 * 60000).toISOString(), state: 'due', remaining_minutes: 20, within_business_hours: true }] }),
            t({ id: 'none', subject: 'No sla' }),
        ];
        render(<TicketList tickets={rows} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        expect(screen.getByText(/^\d+m$|^\dh/)).toBeInTheDocument(); // e.g. "20m"
        expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('lists the 4 sort options and calls onSortChange with the chosen one', () => {
        const onSortChange = vi.fn();
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} onSortChange={onSortChange} />);
        fireEvent.click(screen.getByRole('button', { name: 'Sort tickets' }));
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.map((el) => el.textContent)).toEqual(['Recently updated', 'Newest', 'Priority', 'SLA due']);
        fireEvent.click(screen.getByRole('menuitem', { name: 'Priority' }));
        expect(onSortChange).toHaveBeenCalledWith('priority');
    });

    it('shows a Load more button when hasMore and calls onLoadMore', () => {
        const onLoadMore = vi.fn();
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} hasMore onLoadMore={onLoadMore} />);
        fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
        expect(onLoadMore).toHaveBeenCalled();
    });

    it('hides the Load more button when !hasMore', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} hasMore={false} />);
        expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    });
});
