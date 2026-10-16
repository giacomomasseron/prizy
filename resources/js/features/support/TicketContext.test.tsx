import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
const onFilterTag = vi.fn();
let ticketError = false;

const assignMutate = vi.fn();
let assignState: { isPending: boolean; isError: boolean } = { isPending: false, isError: false };
let meData: Record<string, unknown> | undefined = { id: 'me-1', name: 'Alex Rivera', admin_level: 'member', is_agent: true, is_developer: false, workspace: { helpdesk_enabled: true } };

vi.mock('./hooks', () => ({
    useTicket: () => ({ data: ticketData, isLoading: false, isError: ticketError, refetch: vi.fn() }),
    useAssignTicket: () => ({ mutate: assignMutate, ...assignState }),
}));
vi.mock('../../auth/useAuth', () => ({
    useMe: () => ({ data: meData }),
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

    describe('Assign to me (Support v2)', () => {
        const agentMember = { id: 'me-1', name: 'Alex Rivera', admin_level: 'member', is_agent: true, is_developer: false, workspace: { helpdesk_enabled: true } };
        beforeEach(() => {
            assignMutate.mockReset();
            assignState = { isPending: false, isError: false };
            meData = agentMember;
        });
        afterEach(() => { assignState = { isPending: false, isError: false }; meData = agentMember; });

        it('offers Assign to me on an unassigned ticket and assigns you', () => {
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            fireEvent.click(screen.getByRole('button', { name: 'Assign to me' }));
            expect(assignMutate).toHaveBeenCalledTimes(1);
            expect(assignMutate).toHaveBeenCalledWith('me-1');
        });

        it('leaves keyboard focus in the details panel as it goes away', () => {
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            const button = screen.getByRole('button', { name: 'Assign to me' });
            button.focus();
            fireEvent.click(button);
            expect(document.activeElement).toBe(screen.getByRole('complementary', { name: 'Ticket details' }));
        });

        it('sits under the property rows, drawn as the mockup draws it', () => {
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            const button = screen.getByRole('button', { name: 'Assign to me' });
            expect(screen.getByText('Priority').compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(button.style.background).toBe('var(--hi)');
            expect(button.style.color).toBe('var(--on-hi)');
            expect(button.style.border).toBe('var(--line) solid var(--fg)');
            expect(button.style.borderRadius).toBe('var(--radius-pill)');
            expect(button.style.padding).toBe('9px 14px');
            expect(button.style.fontSize).toBe('13.5px');
            expect(button.style.fontWeight).toBe('800');
        });

        it('is not offered once the ticket has an assignee, you or anyone else', () => {
            ticketData = ticket({ assignee: { id: 'u2', name: 'Maya Chen' } });
            const { unmount } = renderWithRouter('t1');
            expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
            unmount();

            ticketData = ticket({ assignee: { id: 'me-1', name: 'Alex Rivera' } });
            renderWithRouter('t1');
            expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        });

        it('is not offered to a viewer, who only reads the desk', () => {
            meData = { ...agentMember, admin_level: 'viewer' };
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
            expect(screen.getByText('Unassigned')).toBeInTheDocument();
        });

        it('is not offered before you are known', () => {
            meData = undefined;
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        });

        it('goes away while you are being assigned, so it cannot be pressed twice', () => {
            assignState = { isPending: true, isError: false };
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            expect(screen.queryByRole('button', { name: 'Assign to me' })).toBeNull();
        });

        it('says so when the assignment fails, and leaves the button to try again', () => {
            assignState = { isPending: false, isError: true };
            ticketData = ticket({ assignee: null });
            renderWithRouter('t1');
            expect(screen.getByRole('alert').textContent).toBe("Couldn't assign the ticket. Try again.");
            expect(screen.getByRole('button', { name: 'Assign to me' })).toBeInTheDocument();
        });
    });

    it('renders tags when present', () => {
        ticketData = ticket({ tags: [{ id: 't-billing', name: 'billing', color: '#fff' }, { id: 't-urgent', name: 'urgent', color: '#f00' }] });
        renderWithRouter('t1');
        expect(screen.getByText('Tags')).toBeInTheDocument();
        expect(screen.getByText('billing')).toBeInTheDocument();
        expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    it('calls onFilterTag when a tag chip is clicked', () => {
        onFilterTag.mockReset();
        ticketData = ticket({ tags: [{ id: 't-billing', name: 'billing', color: '#fff' }] });
        render(
            <MemoryRouter>
                <TicketContext ticketId="t1" onFilterTag={onFilterTag} />
            </MemoryRouter>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'billing' }));
        expect(onFilterTag).toHaveBeenCalledWith('t-billing', 'billing');
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

    it('hides the SLA card when there are no metrics', () => {
        ticketData = ticket({ sla_metrics: [] });
        renderWithRouter('t1');
        expect(screen.queryByText('First reply due')).not.toBeInTheDocument();
        expect(screen.queryByText('SLA met')).not.toBeInTheDocument();
    });

    it('shows a first-reply countdown for a due ticket', () => {
        ticketData = ticket({
            sla_metrics: [{ metric: 'first_reply', policy_name: 'Standard SLA', target_minutes: 60, due_at: new Date(Date.now() + 20 * 60000).toISOString(), state: 'due', remaining_minutes: 20, within_business_hours: true }],
        });
        renderWithRouter('t1');
        expect(screen.getByText('First reply due')).toBeInTheDocument();
        expect(screen.getByText('First reply target · Standard SLA')).toBeInTheDocument();
    });

    it('shows SLA met', () => {
        ticketData = ticket({ sla_metrics: [{ metric: 'first_reply', policy_name: 'Standard SLA', target_minutes: 60, due_at: new Date().toISOString(), state: 'met', remaining_minutes: 0, within_business_hours: true }] });
        renderWithRouter('t1');
        expect(screen.getByText('SLA met')).toBeInTheDocument();
    });

    it('shows a paused chip for a due metric outside business hours', () => {
        ticketData = ticket({
            sla_metrics: [{ metric: 'first_reply', policy_name: 'Standard SLA', target_minutes: 60, due_at: new Date(Date.now() + 20 * 60000).toISOString(), state: 'due', remaining_minutes: 20, within_business_hours: false }],
        });
        renderWithRouter('t1');
        expect(screen.getByText('⏸ Paused')).toBeInTheDocument();
    });

    it('v2: display-font requester, sentence-case labels, pill tags and a card-shaped SLA block', () => {
        ticketData = ticket({
            tags: [{ id: 't-billing', name: 'billing', color: 'var(--blue)' }],
            sla_metrics: [{ metric: 'first_reply', policy_name: 'Standard SLA', target_minutes: 60, due_at: new Date(Date.now() + 20 * 60000).toISOString(), state: 'due', remaining_minutes: 20, within_business_hours: true }],
        });
        renderWithRouter('t1');
        expect(screen.getByText('Ada Lovelace').style.fontFamily).toBe('var(--font-display)');
        const tagsLabel = screen.getByText('Tags');
        expect(tagsLabel.style.textTransform).toBe('');
        expect(tagsLabel.style.fontSize).toBe('12.5px');
        const tag = screen.getByRole('button', { name: 'billing' });
        expect(tag.className).toContain('hover:border-fg');
        expect(tag.style.borderRadius).toBe('var(--radius-pill)');
        const sla = screen.getByTestId('sla-card');
        expect(sla.style.borderRadius).toBe('var(--radius-card)');
        expect(screen.getByText('First reply due').style.textTransform).toBe('');
    });

    it('G3a: the linked issue card writes its identifier and arrow in the accent ink on the accent tint', () => {
        ticketData = ticket({ linked_issues: [{ id: 'issue-1', identifier: 'PRJ-42', title: 'Fix login' }] });
        renderWithRouter('t1');
        const id = screen.getByText('PRJ-42');
        expect(id.style.color).toBe('var(--accent-ink)');
        expect((id.nextElementSibling as HTMLElement).style.color).toBe('var(--accent-ink)');
        expect((id.closest('a') as HTMLElement).style.background).toBe('var(--accent2)');
    });

    it('G3a: the SLA card writes its title and remaining time in the ink partner', () => {
        ticketData = ticket({ sla_metrics: [{ metric: 'first_reply', policy_name: 'Standard SLA', target_minutes: 60, due_at: new Date().toISOString(), state: 'breached', remaining_minutes: 0, within_business_hours: true }] });
        renderWithRouter('t1');
        expect(screen.getByText('SLA breached').style.color).toBe('var(--red-ink)');
        expect(screen.getByText('Overdue').style.color).toBe('var(--red-ink)');
    });

    it('G3b: the context pane is a named landmark, also while empty', () => {
        ticketData = undefined;
        renderWithRouter(undefined);
        expect(screen.getByRole('complementary', { name: 'Ticket details' })).toBeInTheDocument();
    });
    it('G3c: while the ticket fails the aside stays named but holds no alert and no loading line (the conversation pane carries the message)', () => {
        ticketData = undefined;
        ticketError = true;
        try {
            renderWithRouter('t1');
            const aside = screen.getByRole('complementary', { name: 'Ticket details' });
            expect(within(aside).queryByRole('alert')).toBeNull();
            expect(within(aside).queryByRole('status')).toBeNull();
            expect(within(aside).queryByText(/Loading/)).toBeNull();
        } finally {
            ticketError = false;
        }
    });
});
