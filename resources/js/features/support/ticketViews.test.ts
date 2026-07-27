import { describe, expect, it } from 'vitest';
import { filterByView, viewFilters, viewCount } from './ticketViews';
import type { TicketListItem, TicketCounts } from '../../lib/types';

function t(over: Partial<TicketListItem>): TicketListItem {
    return { id: 'x', subject: 's', status: 'open', priority: 'normal', channel: 'email', requester: null, assignee: null, tags: [], linked_issues: [], sla: { policy_name: null, target_minutes: null, due_at: null, state: 'none' }, updated_at: '', created_at: '', first_replied_at: null, resolved_at: null, ...over };
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

describe('viewFilters', () => {
    it('mine = unsolved assigned to me', () => {
        expect(viewFilters('mine', 'u1')).toEqual({ status: 'new,open,pending,on_hold', assignee_id: 'u1' });
    });
    it('mine without a meId omits assignee_id', () => {
        expect(viewFilters('mine', undefined)).toEqual({ status: 'new,open,pending,on_hold' });
    });
    it('unassigned uses the none sentinel', () => {
        expect(viewFilters('unassigned', 'u1')).toEqual({ assignee_id: 'none' });
    });
    it('solved = solved,closed', () => {
        expect(viewFilters('solved', 'u1')).toEqual({ status: 'solved,closed' });
    });
    it('recent = no filter', () => {
        expect(viewFilters('recent', 'u1')).toEqual({});
    });
});

describe('viewCount', () => {
    const counts: TicketCounts = {
        by_status: { new: 1, open: 2, pending: 3, on_hold: 4, solved: 5, closed: 6 },
        by_channel: { email: 0, chat: 0, portal: 0, api: 0 },
        unassigned: 7, mine_unsolved: 8,
    };
    it('composes each view badge from the raw counts', () => {
        expect(viewCount('mine', counts)).toBe(8);
        expect(viewCount('unassigned', counts)).toBe(7);
        expect(viewCount('all', counts)).toBe(1 + 2 + 3 + 4);   // unsolved
        expect(viewCount('pending', counts)).toBe(3);
        expect(viewCount('solved', counts)).toBe(5 + 6);
        expect(viewCount('recent', counts)).toBe(1 + 2 + 3 + 4 + 5 + 6); // total
    });
});
