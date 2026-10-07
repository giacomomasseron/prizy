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

/** Display names for issue priorities (sentence case: "No priority"). */
export const PRIORITY_LABELS: Record<IssuePriority, string> = {
    no_priority: 'No priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};
