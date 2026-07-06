import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Label } from '../../lib/types';

export function useLabels() {
    return useQuery({ queryKey: ['labels'], queryFn: () => api.page<Label>('/labels') });
}

export function useCreateLabel() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; color?: string; group?: string | null }) => api.post<Label>('/labels', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
    });
}

export function useUpdateLabel() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...input }: { id: string; name?: string; color?: string }) => api.patch<Label>(`/labels/${id}`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
    });
}

export function useDeleteLabel() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/labels/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['labels'] }),
    });
}
