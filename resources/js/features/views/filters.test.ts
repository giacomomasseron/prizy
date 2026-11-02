import { describe, expect, it } from 'vitest';
import { BUILTIN_VIEWS, filtersToParams, paramsToFilters } from './filters';

describe('filters serializer', () => {
    it('round-trips filters through URL params (multi-value CSV + sort)', () => {
        const filters = { status: 'todo,in_progress', label_id: 'l1,l2', sort: '-created_at' };
        const params = filtersToParams(filters);
        expect(params.get('status')).toBe('todo,in_progress');
        expect(params.get('label_id')).toBe('l1,l2');
        expect(params.get('sort')).toBe('-created_at');
        expect(paramsToFilters(params)).toEqual(filters);
    });

    it('omits empty keys so the object is stable', () => {
        expect(paramsToFilters(new URLSearchParams(''))).toEqual({});
        expect(paramsToFilters(new URLSearchParams('status='))).toEqual({});
    });

    it('defines built-in views (My Issues uses the current user id)', () => {
        const myIssues = BUILTIN_VIEWS.find((v) => v.key === 'my-issues');
        expect(myIssues?.build?.('u1')).toEqual({ assignee_id: 'u1' });
        expect(BUILTIN_VIEWS.find((v) => v.key === 'backlog')?.filters).toEqual({ status: 'backlog' });
        expect(BUILTIN_VIEWS.find((v) => v.key === 'active-cycle')?.filters).toEqual({ cycle_id: 'active' });
    });
});
