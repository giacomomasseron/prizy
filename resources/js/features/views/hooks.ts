import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { SavedView } from '../../lib/types';

export function useSavedViews() {
    return useQuery({ queryKey: ['saved-views'], queryFn: () => api.page<SavedView>('/saved-views') });
}

export function useCreateSavedView() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; definition: SavedView['definition'] }) => api.post<SavedView>('/saved-views', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views'] }),
    });
}

export function useUpdateSavedView() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...input }: { id: string; name?: string; definition?: SavedView['definition'] }) => api.patch<SavedView>(`/saved-views/${id}`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views'] }),
    });
}

export function useDeleteSavedView() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/saved-views/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views'] }),
    });
}
