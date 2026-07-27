import { describe, expect, it } from 'vitest';
import { viewFilters, viewCount } from './ticketViews';
import type { TicketCounts } from '../../lib/types';

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
