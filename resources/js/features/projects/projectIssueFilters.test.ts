import { describe, expect, it } from 'vitest';
import { applyIssueFilters } from './projectIssueFilters';
import type { Issue } from '../../lib/types';

function iss(over: Partial<Issue>): Issue {
    return { id: 'x', title: 't', description: null, status: 'todo', priority: 'medium', estimate: null, due_date: null, sort_order: 0, team_id: 't1', project_id: 'p1', cycle_id: null, parent_issue_id: null, assignee_id: null, created_by: 'u1', archived_at: null, created_at: '', updated_at: '', ...over };
}
const list: Issue[] = [
    iss({ id: 'a', status: 'done', priority: 'high', assignee_id: 'u1' }),
    iss({ id: 'b', status: 'in_progress', priority: 'urgent', assignee_id: 'u2' }),
    iss({ id: 'c', status: 'backlog', priority: 'low', assignee_id: null }),
    iss({ id: 'd', status: 'cancelled', priority: 'medium', assignee_id: 'u1' }),
];

describe('applyIssueFilters', () => {
    it('status=all returns everything', () => {
        expect(applyIssueFilters(list, 'all', 'all', 'all').map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    });
    it('status=active excludes done and cancelled', () => {
        expect(applyIssueFilters(list, 'active', 'all', 'all').map((i) => i.id)).toEqual(['b', 'c']);
    });
    it('status=backlog keeps only backlog', () => {
        expect(applyIssueFilters(list, 'backlog', 'all', 'all').map((i) => i.id)).toEqual(['c']);
    });
    it('status=completed keeps done and cancelled', () => {
        expect(applyIssueFilters(list, 'completed', 'all', 'all').map((i) => i.id)).toEqual(['a', 'd']);
    });
    it('priority filters by exact priority', () => {
        expect(applyIssueFilters(list, 'all', 'urgent', 'all').map((i) => i.id)).toEqual(['b']);
    });
    it('assignee=none keeps unassigned', () => {
        expect(applyIssueFilters(list, 'all', 'all', 'none').map((i) => i.id)).toEqual(['c']);
    });
    it('assignee=<id> keeps that assignee', () => {
        expect(applyIssueFilters(list, 'all', 'all', 'u1').map((i) => i.id)).toEqual(['a', 'd']);
    });
    it('combines predicates (AND)', () => {
        expect(applyIssueFilters(list, 'completed', 'high', 'u1').map((i) => i.id)).toEqual(['a']);
    });
});
