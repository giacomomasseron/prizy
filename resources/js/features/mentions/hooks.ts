import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { IssueLookupItem } from '../../lib/types';

/** The lookup's own limit on `q` (LookupIssuesRequest: max 100). */
const MAX_QUERY = 100;

/**
 * Issues for the mention picker, from GET /v1/issues/lookup (P7-A): debounced 200 ms, keeping the previous answer
 * while the next one loads. `pending` is true while a typed query has not been answered yet, so the picker does not
 * flash "no match" between keystrokes.
 */
export function useIssueLookup(q: string, enabled: boolean): { issues: IssueLookupItem[]; pending: boolean } {
    const [debounced, setDebounced] = useState(q);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(q), 200);
        return () => clearTimeout(t);
    }, [q]);

    const active = enabled && debounced !== '' && debounced.length <= MAX_QUERY;
    const lookup = useQuery({
        queryKey: ['issue-lookup', debounced],
        queryFn: () => api.get<IssueLookupItem[]>(`/issues/lookup?q=${encodeURIComponent(debounced)}`),
        enabled: active,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    if (!enabled || q === '') return { issues: [], pending: false };
    return { issues: lookup.data ?? [], pending: debounced !== q || lookup.isFetching };
}
