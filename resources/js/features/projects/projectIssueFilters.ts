import type { Issue } from '../../lib/types';

export type StatusFilter = 'all' | 'active' | 'backlog' | 'completed';
export type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';

function matchesStatus(issue: Issue, f: StatusFilter): boolean {
    if (f === 'all') return true;
    if (f === 'active') return issue.status !== 'done' && issue.status !== 'cancelled';
    if (f === 'backlog') return issue.status === 'backlog';
    return issue.status === 'done' || issue.status === 'cancelled'; // completed
}
function matchesPriority(issue: Issue, f: PriorityFilter): boolean {
    return f === 'all' ? true : issue.priority === f;
}
function matchesAssignee(issue: Issue, f: string): boolean {
    if (f === 'all') return true;
    if (f === 'none') return !issue.assignee_id;
    return issue.assignee_id === f;
}

export function applyIssueFilters(issues: Issue[], status: StatusFilter, priority: PriorityFilter, assignee: string): Issue[] {
    return issues.filter((i) => matchesStatus(i, status) && matchesPriority(i, priority) && matchesAssignee(i, assignee));
}
