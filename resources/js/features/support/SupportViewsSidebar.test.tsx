import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SupportViewsSidebar } from './SupportViewsSidebar';
import { TICKET_VIEWS, filterByView } from './ticketViews';
import type { TicketListItem } from '../../lib/types';

function t(over: Partial<TicketListItem>): TicketListItem {
    return { id: 'x', subject: 's', status: 'open', priority: 'normal', channel: 'email', requester: null, assignee: null, tags: [], linked_issues: [], sla: { policy_name: null, breached: false }, updated_at: '', created_at: '', first_replied_at: null, resolved_at: null, ...over };
}

const meId = 'u1';
const tickets: TicketListItem[] = [
    t({ id: 'a', status: 'open', assignee: { id: 'u1', name: 'Me' } }),
    t({ id: 'b', status: 'new', assignee: null }),
    t({ id: 'c', status: 'pending', assignee: { id: 'u2', name: 'Other' } }),
    t({ id: 'd', status: 'solved', assignee: { id: 'u1', name: 'Me' } }),
    t({ id: 'e', status: 'closed', assignee: null }),
];

describe('SupportViewsSidebar', () => {
    it('renders all 6 views with their filterByView counts', () => {
        render(<SupportViewsSidebar tickets={tickets} view="mine" meId={meId} onSelectView={vi.fn()} />);
        expect(screen.getAllByRole('button')).toHaveLength(TICKET_VIEWS.length);
        for (const v of TICKET_VIEWS) {
            const row = screen.getByText(v.label).closest('button');
            expect(row).not.toBeNull();
            expect(row).toHaveTextContent(String(filterByView(tickets, v.key, meId).length));
        }
    });

    it('highlights the active view and leaves others unhighlighted', () => {
        render(<SupportViewsSidebar tickets={tickets} view="unassigned" meId={meId} onSelectView={vi.fn()} />);
        const active = screen.getByText('Unassigned').closest('button')!;
        const inactive = screen.getByText('Pending').closest('button')!;
        expect(active).toHaveStyle({ fontWeight: '600', background: 'var(--hover)' });
        expect(inactive).toHaveStyle({ fontWeight: '500', background: 'transparent' });
    });

    it('calls onSelectView with the clicked view key', () => {
        const onSelectView = vi.fn();
        render(<SupportViewsSidebar tickets={tickets} view="mine" meId={meId} onSelectView={onSelectView} />);
        fireEvent.click(screen.getByText('Pending'));
        expect(onSelectView).toHaveBeenCalledWith('pending');
    });
});
