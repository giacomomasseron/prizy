import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Release, ReleaseDetail } from '../../lib/types';

interface ReleaseInput {
    name?: string;
    description?: string | null;
    target_date?: string | null;
}

/**
 * Ship/unship and delete can change the status/rollup of issues that belong
 * to the release (an issue's `status` doesn't change, but which release it
 * rolls up under and the release's own rollup do), so — mirroring
 * `useUpdateIssue`'s invalidation of both `['issue', id]` and `['issues']` —
 * we invalidate every issue list AND every cached issue detail (prefix match,
 * we don't know which issue ids are affected).
 */
function invalidateIssueKeys(qc: QueryClient) {
    qc.invalidateQueries({ queryKey: ['issues'] });
    qc.invalidateQueries({ queryKey: ['issue'] });
}

export function useReleases(options?: { enabled?: boolean }) {
    return useQuery({ queryKey: ['releases'], queryFn: () => api.get<Release[]>('/releases'), enabled: options?.enabled });
}

export function useRelease(id: string) {
    return useQuery({ queryKey: ['releases', id], queryFn: () => api.get<ReleaseDetail>(`/releases/${id}`), enabled: !!id });
}

export function useCreateRelease() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: ReleaseInput & { name: string }) => api.post<Release>('/releases', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['releases'] }),
    });
}

export function useUpdateRelease(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: ReleaseInput) => api.patch<Release>(`/releases/${id}`, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['releases'] });
            qc.invalidateQueries({ queryKey: ['releases', id] });
        },
    });
}

export function useDeleteRelease() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/releases/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['releases'] });
            invalidateIssueKeys(qc);
        },
    });
}

export function useShipRelease(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ship: boolean) => api.post<Release>(`/releases/${id}/${ship ? 'ship' : 'unship'}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['releases'] });
            qc.invalidateQueries({ queryKey: ['releases', id] });
            invalidateIssueKeys(qc);
        },
    });
}
