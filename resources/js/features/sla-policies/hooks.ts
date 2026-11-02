import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { SlaPolicy } from '../../lib/types';

export interface SlaPolicyPayload {
    name: string;
    first_reply_minutes: number;
    next_reply_minutes: number | null;
    resolution_minutes: number;
    schedule_id: string | null;
}

export function useSlaPolicies() {
    return useQuery({ queryKey: ['sla-policies'], queryFn: () => api.get<SlaPolicy[]>('/sla-policies') });
}

export function useCreateSlaPolicy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: SlaPolicyPayload) => api.post<SlaPolicy>('/sla-policies', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
    });
}

export function useUpdateSlaPolicy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }: SlaPolicyPayload & { id: string }) => api.patch<SlaPolicy>(`/sla-policies/${id}`, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
    });
}

export function useDeleteSlaPolicy() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/sla-policies/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-policies'] }),
    });
}
