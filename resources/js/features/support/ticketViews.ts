import type { TicketListItem, TicketCounts } from '../../lib/types';

export type TicketViewKey = 'mine' | 'unassigned' | 'all' | 'recent' | 'pending' | 'solved';

export const TICKET_VIEWS: { key: TicketViewKey; label: string; icon: string }[] = [
    { key: 'mine', label: 'Your unsolved tickets', icon: '◉' },
    { key: 'unassigned', label: 'Unassigned', icon: '○' },
    { key: 'all', label: 'All unsolved', icon: '▤' },
    { key: 'recent', label: 'Recently updated', icon: '↻' },
    { key: 'pending', label: 'Pending', icon: '◔' },
    { key: 'solved', label: 'Recently solved', icon: '✓' },
];

const unsolved = (t: TicketListItem) => t.status !== 'solved' && t.status !== 'closed';

export function filterByView(tickets: TicketListItem[], view: TicketViewKey, meId: string | undefined): TicketListItem[] {
    switch (view) {
        case 'mine': return tickets.filter((t) => unsolved(t) && t.assignee?.id === meId);
        case 'unassigned': return tickets.filter((t) => !t.assignee);
        case 'all': return tickets.filter(unsolved);
        case 'pending': return tickets.filter((t) => t.status === 'pending');
        case 'solved': return tickets.filter((t) => t.status === 'solved' || t.status === 'closed');
        case 'recent': default: return tickets;
    }
}

const UNSOLVED = 'new,open,pending,on_hold';

export function viewFilters(view: TicketViewKey, meId: string | undefined): Record<string, string> {
    switch (view) {
        case 'mine': return meId ? { status: UNSOLVED, assignee_id: meId } : { status: UNSOLVED };
        case 'unassigned': return { assignee_id: 'none' };
        case 'all': return { status: UNSOLVED };
        case 'pending': return { status: 'pending' };
        case 'solved': return { status: 'solved,closed' };
        case 'recent': default: return {};
    }
}

export function viewCount(view: TicketViewKey, c: TicketCounts): number {
    const s = c.by_status;
    const unsolved = s.new + s.open + s.pending + s.on_hold;
    switch (view) {
        case 'mine': return c.mine_unsolved;
        case 'unassigned': return c.unassigned;
        case 'all': return unsolved;
        case 'pending': return s.pending;
        case 'solved': return s.solved + s.closed;
        case 'recent': default: return unsolved + s.solved + s.closed;
    }
}
