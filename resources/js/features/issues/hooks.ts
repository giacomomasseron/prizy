import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Issue, IssueStatus, IssuePriority, IssueComment, IssueActivity, Label } from '../../lib/types';

export interface CreateIssueInput {
    team_id: string;
    title: string;
    status?: IssueStatus;
    priority?: IssuePriority;
    assignee_id?: string | null;
    project_id?: string | null;
    release_id?: string | null;
    description?: string | null;
    /** Applied after creation via the labels endpoint (the create endpoint ignores it). */
    label_ids?: string[];
}

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

export function useIssues(filters: IssueFilters = {}, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['issues', filters],
        queryFn: () => api.page<Issue>(issuesPath(filters)),
        enabled: options?.enabled,
    });
}

export function useCreateIssue() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ label_ids, ...data }: CreateIssueInput) => {
            const issue = await api.post<Issue>('/issues', data);
            // The create endpoint doesn't accept labels; apply them via the labels endpoint.
            if (label_ids && label_ids.length > 0) {
                await api.put<Label[]>(`/issues/${issue.id}/labels`, { label_ids });
            }
            return issue;
        },
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
            // Optimistic update for the list/board
            const snapshots = qc.getQueriesData<IssuePage>({ queryKey: ['issues'] });
            for (const [key, page] of snapshots) {
                qc.setQueryData(key, applyStatusOptimistic(page, vars.id, vars.status));
            }
            // Optimistic update for the detail page (IssueDetailPage uses ['issue', id])
            const prevDetail = qc.getQueryData<Issue>(['issue', vars.id]);
            if (prevDetail) {
                qc.setQueryData<Issue>(['issue', vars.id], { ...prevDetail, status: vars.status });
            }
            return { snapshots, prevDetail };
        },
        onError: (_err, vars, ctx) => {
            ctx?.snapshots.forEach(([key, page]) => qc.setQueryData(key, page));
            if (ctx?.prevDetail) {
                qc.setQueryData<Issue>(['issue', vars.id], ctx.prevDetail);
            }
        },
        onSuccess: (data, vars) => {
            // Update the detail cache with the authoritative server response so the
            // detail page never has to re-fetch (avoids a transient isLoading flash).
            if (data) qc.setQueryData<Issue>(['issue', vars.id], data);
        },
        onSettled: (_data, _err, vars) => {
            // Invalidate list/board queries so they stay in sync.
            // The detail cache is handled by onMutate (optimistic) + onSuccess (server data),
            // so we do NOT invalidate ['issue', id] here — that would cause a re-fetch
            // which makes isLoading transiently true if there is no pre-existing cache entry,
            // hiding the properties panel and its interactive editors.
            qc.invalidateQueries({ queryKey: ['issues'] });
            // Invalidate only the activities sub-query so the feed refreshes after a
            // status change without triggering a full detail re-fetch / loading flash.
            qc.invalidateQueries({ queryKey: ['issue', vars.id, 'activities'] });
        },
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

export function useToggleReaction(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { commentId: string; emoji: string }) =>
            api.post<IssueComment>(`/issues/${id}/comments/${vars.commentId}/reactions`, { emoji: vars.emoji }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['issue', id, 'comments'] }),
    });
}

export function useUpdateIssue(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Pick<Issue, 'title' | 'description' | 'priority'>> & { project_id?: string | null; cycle_id?: string | null; release_id?: string | null }) => api.patch<Issue>(`/issues/${id}`, data),
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
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['issue', issueId, 'labels'] });
            qc.invalidateQueries({ queryKey: ['issue', issueId, 'activities'] });
        },
    });
}

export function useAssignIssue(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (assigneeId: string | null) =>
            api.put<Issue>(`/issues/${id}/assignee`, { assignee_id: assigneeId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['issue', id] });
            qc.invalidateQueries({ queryKey: ['issues'] });
        },
    });
}

export function useArchiveIssue(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<Issue>(`/issues/${id}/archive`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['issue', id] }); qc.invalidateQueries({ queryKey: ['issues'] }); },
    });
}
