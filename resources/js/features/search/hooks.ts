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

export interface AdvancedSearchFilters {
    status?: string;
    priority?: string;
    team_id?: string;
    project_id?: string;
    assignee_id?: string;
    label_id?: string;
    source?: string;
}

interface IssueSearchParams extends AdvancedSearchFilters {
    q: string;
    sort: string; // 'updated' | 'priority' | 'status'
    page: number;
}

const FILTER_PARAM_KEYS: Array<keyof AdvancedSearchFilters> = [
    'status',
    'priority',
    'team_id',
    'project_id',
    'assignee_id',
    'label_id',
    'source',
];

interface IssuePage {
    items: Issue[];
    currentPage: number;
    lastPage: number;
}

export function useIssueSearch(params: IssueSearchParams) {
    const term = params.q.trim();
    return useQuery({
        queryKey: ['search-issues', params],
        queryFn: async (): Promise<IssuePage> => {
            const qs = new URLSearchParams();
            if (term) qs.set('q', term);
            qs.set('page', String(params.page));
            qs.set('sort', params.sort);
            for (const key of FILTER_PARAM_KEYS) {
                const v = params[key];
                if (v) qs.set(`filter[${key}]`, v);
            }
            const res = await api.getEnvelope<Issue[]>(`/search/issues?${qs.toString()}`);
            return {
                items: res.data,
                currentPage: res.meta?.current_page ?? 1,
                lastPage: res.meta?.last_page ?? 1,
            };
        },
    });
}
