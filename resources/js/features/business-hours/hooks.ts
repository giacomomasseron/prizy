import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Schedule, ScheduleInterval } from '../../lib/types';

export interface SchedulePayload {
    name: string;
    timezone: string;
    intervals: ScheduleInterval[];
}

export function useSchedules() {
    return useQuery({ queryKey: ['schedules'], queryFn: () => api.get<Schedule[]>('/business-hours') });
}

export function useCreateSchedule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: SchedulePayload) => api.post<Schedule>('/business-hours', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
    });
}

export function useUpdateSchedule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }: SchedulePayload & { id: string }) => api.patch<Schedule>(`/business-hours/${id}`, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
    });
}

export function useDeleteSchedule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/business-hours/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
    });
}
