import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Issue, IssueStatus } from '../../lib/types';

export interface IssueFilters { status?: IssueStatus }

function issuesPath(filters: IssueFilters): string {
    const params = new URLSearchParams();
    if (filters.status) params.set('filter[status]', filters.status);
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
