import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Issue, SearchResults } from '../../lib/types';

export function useSearch(q: string) {
    const term = q.trim();
    return useQuery({
        queryKey: ['search', term],
        queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(term)}`),
        enabled: term.length >= 1,
    });
}

interface IssueSearchParams {
    q: string;
    status?: string;
    team_id?: string;
    page: number;
}

interface IssuePage {
    items: Issue[];
    currentPage: number;
    lastPage: number;
}

export function useIssueSearch(params: IssueSearchParams) {
    const term = params.q.trim();
    return useQuery({
        queryKey: ['search-issues', params],
        enabled: term.length >= 1,
        queryFn: async (): Promise<IssuePage> => {
            const qs = new URLSearchParams();
            qs.set('q', term);
            qs.set('page', String(params.page));
            if (params.status) qs.set('filter[status]', params.status);
            if (params.team_id) qs.set('filter[team_id]', params.team_id);
            const res = await api.getEnvelope<Issue[]>(`/search/issues?${qs.toString()}`);
            return {
                items: res.data,
                currentPage: res.meta?.current_page ?? 1,
                lastPage: res.meta?.last_page ?? 1,
            };
        },
    });
}
