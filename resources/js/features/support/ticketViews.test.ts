import { describe, expect, it } from 'vitest';
import { filterByView } from './ticketViews';
import type { TicketListItem } from '../../lib/types';

function t(over: Partial<TicketListItem>): TicketListItem {
    return { id: 'x', subject: 's', status: 'open', priority: 'normal', channel: 'email', requester: null, assignee: null, tags: [], linked_issues: [], sla: { policy_name: null, breached: false }, updated_at: '', created_at: '', first_replied_at: null, resolved_at: null, ...over };
}
const me = 'u1';
const list: TicketListItem[] = [
    t({ id: 'a', status: 'open', assignee: { id: 'u1', name: 'Me' } }),
    t({ id: 'b', status: 'new', assignee: null }),
    t({ id: 'c', status: 'pending', assignee: { id: 'u2', name: 'Other' } }),
    t({ id: 'd', status: 'solved', assignee: { id: 'u1', name: 'Me' } }),
    t({ id: 'e', status: 'closed', assignee: null }),
];

describe('filterByView', () => {
    it('mine = unsolved assigned to me', () => {
        expect(filterByView(list, 'mine', me).map((x) => x.id)).toEqual(['a']);
    });
    it('unassigned = no assignee', () => {
        expect(filterByView(list, 'unassigned', me).map((x) => x.id)).toEqual(['b', 'e']);
    });
    it('all = unsolved (not solved/closed)', () => {
        expect(filterByView(list, 'all', me).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    });
    it('pending = status pending', () => {
        expect(filterByView(list, 'pending', me).map((x) => x.id)).toEqual(['c']);
    });
    it('solved = solved or closed', () => {
        expect(filterByView(list, 'solved', me).map((x) => x.id)).toEqual(['d', 'e']);
    });
    it('recent = everything', () => {
        expect(filterByView(list, 'recent', me)).toHaveLength(5);
    });
});
