import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TicketContext } from './TicketContext';
import type { TicketDetail } from '../../lib/types';

function ticket(over: Partial<TicketDetail>): TicketDetail {
    return {
        id: 'ticket-12345678',
        subject: 'Cannot log in',
        status: 'open',
        priority: 'normal',
        channel: 'email',
        requester: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', org: null, plan: null },
        assignee: null,
        tags: [],
        linked_issues: [],
        sla: { policy_name: null, breached: false },
        updated_at: '',
        created_at: '',
        first_replied_at: null,
        resolved_at: null,
        messages: [],
        requester_history: [],
        ...over,
    };
}

let ticketData: TicketDetail | undefined;

vi.mock('./hooks', () => ({
    useTicket: () => ({ data: ticketData, isLoading: false }),
}));

function renderWithRouter(ticketId: string | undefined) {
    return render(
        <MemoryRouter>
            <TicketContext ticketId={ticketId} />
        </MemoryRouter>,
    );
}

describe('TicketContext', () => {
    it('renders nothing (an empty aside) when there is no ticket selected or no data', () => {
        ticketData = undefined;
        const { container } = renderWithRouter(undefined);
        expect(container.querySelector('aside')).toBeInTheDocument();
        expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });

    it('renders the requester name and email', () => {
        ticketData = ticket({ requester: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', org: null, plan: null } });
        renderWithRouter('t1');
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    });

    it('shows organization and plan when present', () => {
        ticketData = ticket({ requester: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', org: 'Acme Inc', plan: 'Enterprise' } });
        renderWithRouter('t1');
        expect(screen.getByText('Organization')).toBeInTheDocument();
        expect(screen.getByText('Acme Inc')).toBeInTheDocument();
        expect(screen.getByText('Plan')).toBeInTheDocument();
        expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });

    it('hides organization and plan rows when null', () => {
        ticketData = ticket({ requester: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', org: null, plan: null } });
        renderWithRouter('t1');
        expect(screen.queryByText('Organization')).not.toBeInTheDocument();
        expect(screen.queryByText('Plan')).not.toBeInTheDocument();
    });

    it('shows the assignee name, or "Unassigned" when none', () => {
        ticketData = ticket({ assignee: { id: 'u2', name: 'Grace Hopper' } });
        renderWithRouter('t1');
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

        ticketData = ticket({ assignee: null });
        renderWithRouter('t2');
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    it('renders tags when present', () => {
        ticketData = ticket({ tags: [{ name: 'billing', color: '#fff' }, { name: 'urgent', color: '#f00' }] });
        renderWithRouter('t1');
        expect(screen.getByText('Tags')).toBeInTheDocument();
        expect(screen.getByText('billing')).toBeInTheDocument();
        expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    it('omits the Tags section when there are no tags', () => {
        ticketData = ticket({ tags: [] });
        renderWithRouter('t1');
        expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('renders the linked engineering issue with a link to /issues/:id', () => {
        ticketData = ticket({ linked_issues: [{ id: 'issue-1', identifier: 'PRJ-42', title: 'Fix login' }] });
        renderWithRouter('t1');
        expect(screen.getByText('Linked engineering issue')).toBeInTheDocument();
        expect(screen.getByText('PRJ-42')).toBeInTheDocument();
        expect(screen.getByText('Fix login')).toBeInTheDocument();
        expect(screen.getByText('PRJ-42').closest('a')).toHaveAttribute('href', '/issues/issue-1');
    });

    it('renders requester history entries', () => {
        ticketData = ticket({
            requester_history: [
                { id: 'h1', subject: 'Previous ticket A', status: 'solved' },
                { id: 'h2', subject: 'Previous ticket B', status: 'open' },
            ],
        });
        renderWithRouter('t1');
        expect(screen.getByText('Recent from Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('Previous ticket A')).toBeInTheDocument();
        expect(screen.getByText('Previous ticket B')).toBeInTheDocument();
    });

    it('omits the history section when there is no requester history', () => {
        ticketData = ticket({ requester_history: [] });
        renderWithRouter('t1');
        expect(screen.queryByText(/^Recent from/)).not.toBeInTheDocument();
    });
});
