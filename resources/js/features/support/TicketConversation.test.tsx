import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TicketConversation } from './TicketConversation';
import type { TicketDetail, TicketMessage } from '../../lib/types';

function msg(over: Partial<TicketMessage>): TicketMessage {
    return { id: 'm1', kind: 'customer', sender: { name: 'Ada Lovelace' }, body: 'hello', created_at: '', ...over };
}

function ticket(over: Partial<TicketDetail>): TicketDetail {
    return {
        id: 'ticket-12345678',
        subject: 'Cannot log in',
        status: 'open',
        priority: 'normal',
        channel: 'email',
        requester: null,
        assignee: null,
        tags: [],
        linked_issues: [],
        sla_metrics: [],
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
let isLoading = false;

vi.mock('./hooks', () => ({
    useTicket: () => ({ data: ticketData, isLoading }),
    usePostTicketMessage: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
    useChangeTicketStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithRouter(ticketId: string | undefined) {
    return render(
        <MemoryRouter>
            <TicketConversation ticketId={ticketId} />
        </MemoryRouter>,
    );
}

describe('TicketConversation', () => {
    it('shows a "Select a ticket" empty state when no ticket is selected', () => {
        ticketData = undefined;
        isLoading = false;
        renderWithRouter(undefined);
        expect(screen.getByText('Select a ticket')).toBeInTheDocument();
    });

    it('shows a loading state while the ticket is fetching', () => {
        ticketData = undefined;
        isLoading = true;
        renderWithRouter('t1');
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders the three message kinds with correct data-kind and role labels', () => {
        ticketData = ticket({
            messages: [
                msg({ id: 'm1', kind: 'customer', sender: { name: 'Ada Lovelace' }, body: 'It is broken' }),
                msg({ id: 'm2', kind: 'agent', sender: { name: 'Grace Hopper' }, body: 'Looking into it' }),
                msg({ id: 'm3', kind: 'note', sender: { name: 'Grace Hopper' }, body: 'Escalate to eng' }),
            ],
        });
        isLoading = false;
        renderWithRouter('t1');

        const rows = screen.getAllByTestId('ticket-message');
        expect(rows).toHaveLength(3);
        expect(rows[0]).toHaveAttribute('data-kind', 'customer');
        expect(rows[1]).toHaveAttribute('data-kind', 'agent');
        expect(rows[2]).toHaveAttribute('data-kind', 'note');

        expect(within(rows[0]).getByText('Customer')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Agent')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Internal note')).toBeInTheDocument();
        expect(within(rows[0]).getByText('It is broken')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Looking into it')).toBeInTheDocument();
        expect(within(rows[2]).getByText('Escalate to eng')).toBeInTheDocument();
    });

    it('renders the composer (textarea) below the thread', () => {
        ticketData = ticket({ messages: [msg({})] });
        isLoading = false;
        renderWithRouter('t1');
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(document.querySelector('textarea')).toBeInTheDocument();
    });

    it('renders a linked-issue link pointing at /issues/:id', () => {
        ticketData = ticket({
            linked_issues: [{ id: 'issue-1', identifier: 'PRJ-42', title: 'Fix login' }],
        });
        isLoading = false;
        renderWithRouter('t1');
        const link = screen.getByText('↩ PRJ-42 ↗');
        expect(link).toHaveAttribute('href', '/issues/issue-1');
    });
});
