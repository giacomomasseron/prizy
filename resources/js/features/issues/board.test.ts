import { expect, it } from 'vitest';
import { groupByStatus, STATUSES, applyStatusOptimistic } from './hooks';
import type { Issue } from '../../lib/types';

const issue = (id: string, status: Issue['status']): Issue => ({
    id, title: id, description: null, status, priority: 'no_priority', estimate: null, due_date: null,
    sort_order: 0, team_id: 't', project_id: null, cycle_id: null, parent_issue_id: null,
    assignee_id: null, created_by: 'u', archived_at: null, created_at: '', updated_at: '',
});

it('groups issues into all six status buckets', () => {
    const grouped = groupByStatus([issue('a', 'todo'), issue('b', 'done')]);
    expect(STATUSES).toHaveLength(6);
    expect(grouped.todo.map((i) => i.id)).toEqual(['a']);
    expect(grouped.done.map((i) => i.id)).toEqual(['b']);
    expect(grouped.backlog).toEqual([]);
});

it('optimistically moves an issue to the new status', () => {
    const page = { items: [issue('a', 'todo')], next: null };
    const next = applyStatusOptimistic(page, 'a', 'in_progress');
    expect(next.items[0].status).toBe('in_progress');
    // original is not mutated
    expect(page.items[0].status).toBe('todo');
});
