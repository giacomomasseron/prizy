import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { GithubLink } from '../../lib/types';

function key(issueId: string) {
    return ['issues', issueId, 'github-links'];
}

export function useGithubLinks(issueId: string) {
    return useQuery({ queryKey: key(issueId), queryFn: () => api.get<GithubLink[]>(`/issues/${issueId}/github-links`) });
}

export function useAddGithubLink(issueId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (url: string) => api.post<GithubLink>(`/issues/${issueId}/github-links`, { url }),
        onSuccess: () => qc.invalidateQueries({ queryKey: key(issueId) }),
    });
}

export function useRemoveGithubLink(issueId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (linkId: string) => api.del(`/issues/${issueId}/github-links/${linkId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: key(issueId) }),
    });
}
