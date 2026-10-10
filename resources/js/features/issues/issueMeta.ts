import type { IssuePriority, IssueStatus } from '../../lib/types';

/** Display names for issue statuses — the one copy every issue screen uses. Hook-free on purpose. */
export const STATUS_LABELS: Record<IssueStatus, string> = {
    backlog: 'Backlog',
    todo: 'Todo',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled',
};

/** An issue's reference (PRD §3.2.1): `PRZ-` and the first 6 characters of its id, in capitals — `PRZ-3F9A1C`. */
export function issueRefFromId(id: string): string {
    return `PRZ-${id.slice(0, 6).toUpperCase()}`;
}

/** The reference to show for an issue: the server's `identifier`, else the same reference built from the id. */
export function issueRef(issue: { id: string; identifier?: string | null }): string {
    return issue.identifier ?? issueRefFromId(issue.id);
}

/** Display names for issue priorities (sentence case: "No priority"). */
export const PRIORITY_LABELS: Record<IssuePriority, string> = {
    no_priority: 'No priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};
