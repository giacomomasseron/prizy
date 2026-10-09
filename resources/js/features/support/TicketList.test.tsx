import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    it('v2: display-font header and a toolbar-pill sort trigger', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        expect(screen.getByText('Tickets').style.fontFamily).toBe('var(--font-display)');
        expect(screen.getByRole('button', { name: 'Sort tickets' }).className).toContain('hover:border-fg');
    });

    it('v2: sentence-case pill status tags, and unselected rows whose hover is not blocked', () => {
        render(<TicketList tickets={tickets} selectedId="a" onSelect={vi.fn()} {...baseProps()} />);
        const tag = screen.getByText('Pending');
        expect(tag.style.textTransform).toBe('');
        expect(tag.style.borderRadius).toBe('var(--radius-pill)');
        expect(tag.style.background).toBe('color-mix(in srgb, var(--amber) 15%, transparent)');
        const [selected, other] = screen.getAllByTestId('ticket-row');
        expect(selected.style.background).toBe('var(--panel)');
        expect(other.className).toContain('hover:bg-hover');
        expect(other.style.background).toBe('');
        expect(screen.getByText('↩ PRJ-42').style.borderRadius).toBe('var(--radius-pill)');
    });

    it('v2: Load more is a Button, and the urgent chip uses a token for its text', () => {
        render(<TicketList tickets={[t({ id: 'u', priority: 'urgent' })]} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} hasMore />);
        expect(screen.getByRole('button', { name: 'Load more' }).className).toContain('border-border2');
        expect(screen.getByRole('img', { name: 'Priority: Urgent' }).style.color).toBe('var(--on-hi)');
    });

    it('v2: the selected row carries a border2 ring, so it reads apart from a hovered row', () => {
        render(<TicketList tickets={tickets} selectedId="a" onSelect={vi.fn()} {...baseProps()} />);
        const [selected, other] = screen.getAllByTestId('ticket-row');
        expect(selected.style.boxShadow).toBe('inset 0 0 0 1.5px var(--field)');
        expect(other.style.boxShadow).toBe('');
    });

    it('G3b: each subject is the row\'s button — Enter or Space selects the ticket, and the open ticket is current', async () => {
        const onSelect = vi.fn();
        render(<TicketList tickets={tickets} selectedId="a" onSelect={onSelect} {...baseProps()} />);
        const open = screen.getByRole('button', { name: 'Cannot log in' });
        const other = screen.getByRole('button', { name: 'Billing question' });
        expect(open).toHaveAttribute('aria-current', 'true');
        expect(other).not.toHaveAttribute('aria-current');
        other.focus();
        await userEvent.keyboard('{Enter}');
        expect(onSelect).toHaveBeenLastCalledWith('b');
        await userEvent.keyboard(' ');
        expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('G3b: a row draws the inset ink ring while its subject has keyboard focus', () => {
        render(<TicketList tickets={tickets} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        const row = screen.getAllByTestId('ticket-row')[0];
        expect(row.className).toContain('has-[.row-primary:focus-visible]:outline-2');
        expect(row.className).toContain('has-[.row-primary:focus-visible]:-outline-offset-2');
        expect(screen.getByRole('button', { name: 'Cannot log in' }).className).toContain('focus-visible:outline-none');
    });

    it('G3c: the ticket priority icon is an image named "Priority: <Label>"', () => {
        render(<TicketList tickets={[t({ id: 'h', priority: 'high' }), t({ id: 'u2', priority: 'urgent' })]} selectedId={undefined} onSelect={vi.fn()} {...baseProps()} />);
        expect(screen.getByRole('img', { name: 'Priority: High' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Priority: Urgent' })).toBeInTheDocument();
    });
});
