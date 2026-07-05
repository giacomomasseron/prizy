import type { IssueFilters } from '../issues/hooks';
import type { IssuePriority, IssueStatus } from '../../lib/types';

export type FilterKey = 'status' | 'priority' | 'team_id' | 'project_id' | 'label_id' | 'assignee_id' | 'source';

const PARAM_KEYS: Array<keyof IssueFilters> = ['status', 'priority', 'team_id', 'project_id', 'cycle_id', 'assignee_id', 'label_id', 'sort'];

export const STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
export const PRIORITIES: IssuePriority[] = ['no_priority', 'urgent', 'high', 'medium', 'low'];

/** Menu-selectable filter fields. Entity fields (team/project/label) get their options at render time from hooks. */
export const FILTER_FIELDS: Array<{ key: FilterKey; label: string; kind: 'enum' | 'team' | 'project' | 'label'; options?: string[] }> = [
    { key: 'status', label: 'Status', kind: 'enum', options: STATUSES },
    { key: 'priority', label: 'Priority', kind: 'enum', options: PRIORITIES },
    { key: 'team_id', label: 'Team', kind: 'team' },
    { key: 'project_id', label: 'Project', kind: 'project' },
    { key: 'label_id', label: 'Label', kind: 'label' },
];

/** Filter fields for the Advanced Search page (superset of FILTER_FIELDS; no Team field). */
export const SEARCH_FILTER_FIELDS: Array<{ key: FilterKey; label: string; kind: 'enum' | 'team' | 'project' | 'label' | 'assignee' | 'source'; options?: string[] }> = [
    { key: 'status', label: 'Status', kind: 'enum', options: STATUSES },
    { key: 'priority', label: 'Priority', kind: 'enum', options: PRIORITIES },
    { key: 'assignee_id', label: 'Assignee', kind: 'assignee' },
    { key: 'project_id', label: 'Project', kind: 'project' },
    { key: 'label_id', label: 'Label', kind: 'label' },
    { key: 'source', label: 'Source', kind: 'source', options: ['support', 'native'] },
];

export const SORT_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'sort_order', label: 'Manual' },
    { value: '-created_at', label: 'Newest' },
    { value: 'created_at', label: 'Oldest' },
    { value: '-updated_at', label: 'Recently updated' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due date' },
    { value: 'title', label: 'Title' },
];

/** Non-editable pills produced by built-in views (no value picker). */
export const PRESET_PILLS: Record<string, (value: string) => string> = {
    assignee_id: () => 'Assigned to me',
    cycle_id: (value) => (value === 'active' ? 'Active cycle' : 'Cycle'),
};

export const BUILTIN_VIEWS: Array<{
    key: string;
    label: string;
    filters?: IssueFilters;
    build?: (userId: string) => IssueFilters;
}> = [
    { key: 'my-issues', label: 'My Issues', build: (userId) => ({ assignee_id: userId }) },
    { key: 'backlog', label: 'Backlog', filters: { status: 'backlog' } },
    { key: 'active-cycle', label: 'Active Cycle', filters: { cycle_id: 'active' } },
];

export function paramsToFilters(sp: URLSearchParams): IssueFilters {
    const filters: IssueFilters = {};
    for (const key of PARAM_KEYS) {
        const value = sp.get(key);
        if (value) filters[key] = value;
    }
    return filters;
}

export function filtersToParams(filters: IssueFilters): URLSearchParams {
    const params = new URLSearchParams();
    for (const key of PARAM_KEYS) {
        const value = filters[key];
        if (value) params.set(key, value);
    }
    return params;
}
