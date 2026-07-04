import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Issue, IssueStatus, IssueComment, IssueActivity, Label } from '../../lib/types';

export interface IssueFilters {
    status?: string;
    priority?: string;
    team_id?: string;
    project_id?: string;
    cycle_id?: string;
    assignee_id?: string;
    label_id?: string;
    sort?: string;
}

const FILTER_PARAM_KEYS = ['status', 'priority', 'team_id', 'project_id', 'cycle_id', 'assignee_id', 'label_id'] as const;

function issuesPath(filters: IssueFilters): string {
    const params = new URLSearchParams();
    for (const key of FILTER_PARAM_KEYS) {
        const value = filters[key];
        if (value) params.set(`filter[${key}]`, value);
    }
    if (filters.sort) params.set('sort', filters.sort);
    params.set('limit', '100');
    return `/issues?${params.toString()}`;
}

export function useIssues(filters: IssueFilters = {}) {
    return useQuery({
        queryKey: ['issues', filters],
        queryFn: () => api.page<Issue>(issuesPath(filters)),
    });
}

export function useCreateIssue() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { team_id: string; title: string }) => api.post<Issue>('/issues', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
    });
}

export const STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

export const LIST_GROUP_ORDER: IssueStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled'];

export const BOARD_STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

export function groupByStatus(issues: Issue[]): Record<IssueStatus, Issue[]> {
    const buckets = Object.fromEntries(STATUSES.map((s) => [s, [] as Issue[]])) as Record<IssueStatus, Issue[]>;
    for (const issue of issues) {
        (buckets[issue.status] ??= []).push(issue);
    }
    return buckets;
}

type IssuePage = { items: Issue[]; next: string | null };

export function applyStatusOptimistic(page: IssuePage | undefined, id: string, status: IssueStatus): IssuePage {
    if (!page) return { items: [], next: null };
    return { ...page, items: page.items.map((i) => (i.id === id ? { ...i, status } : i)) };
}

export function useTransitionStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { id: string; status: IssueStatus }) =>
            api.put<Issue>(`/issues/${vars.id}/status`, { status: vars.status }),
        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: ['issues'] });
            const snapshots = qc.getQueriesData<IssuePage>({ queryKey: ['issues'] });
            for (const [key, page] of snapshots) {
                qc.setQueryData(key, applyStatusOptimistic(page, vars.id, vars.status));
            }
            return { snapshots };
        },
        onError: (_err, _vars, ctx) => {
            ctx?.snapshots.forEach(([key, page]) => qc.setQueryData(key, page));
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ['issues'] }),
    });
}

export function useIssue(id: string) {
    return useQuery({ queryKey: ['issue', id], queryFn: () => api.get<Issue>(`/issues/${id}`), enabled: !!id });
}

export function useComments(id: string) {
    return useQuery({ queryKey: ['issue', id, 'comments'], queryFn: () => api.page<IssueComment>(`/issues/${id}/comments`), enabled: !!id });
}

export function useActivities(id: string) {
    return useQuery({ queryKey: ['issue', id, 'activities'], queryFn: () => api.page<IssueActivity>(`/issues/${id}/activities`), enabled: !!id });
}

export function useAddComment(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: string) => api.post<IssueComment>(`/issues/${id}/comments`, { body }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['issue', id, 'comments'] }),
    });
}

export function useUpdateIssue(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Pick<Issue, 'title' | 'description' | 'priority'>> & { project_id?: string | null; cycle_id?: string | null }) => api.patch<Issue>(`/issues/${id}`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['issue', id] }); qc.invalidateQueries({ queryKey: ['issues'] }); },
    });
}

export function useIssueLabels(issueId: string) {
    return useQuery({
        queryKey: ['issue', issueId, 'labels'],
        queryFn: () => api.page<Label>(`/issues/${issueId}/labels`),
        enabled: !!issueId,
    });
}

export function useSetIssueLabels(issueId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (labelIds: string[]) => api.put<Label[]>(`/issues/${issueId}/labels`, { label_ids: labelIds }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['issue', issueId, 'labels'] }),
    });
}

export function useArchiveIssue(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<Issue>(`/issues/${id}/archive`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['issue', id] }); qc.invalidateQueries({ queryKey: ['issues'] }); },
    });
}
