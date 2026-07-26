import type { TicketListItem } from '../../lib/types';

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
