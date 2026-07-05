import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Cycle, Team } from '../../lib/types';

export function useTeams() {
    return useQuery({ queryKey: ['teams'], queryFn: () => api.page<Team>('/teams') });
}

export function useCreateTeam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; identifier: string; color?: string }) => api.post<Team>('/teams', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
    });
}

export function useUpdateTeam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...input }: { id: string; name?: string; identifier?: string; color?: string }) =>
            api.patch<Team>(`/teams/${id}`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
    });
}

export function useDeleteTeam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/teams/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
    });
}

// --- cycles (team-nested); used by TeamDetailPage in Task 3 ---
export function useCycles(teamId: string) {
    return useQuery({
        queryKey: ['teams', teamId, 'cycles'],
        queryFn: () => api.page<Cycle>(`/teams/${teamId}/cycles`),
        enabled: !!teamId,
    });
}

interface CycleInput {
    name: string;
    starts_at: string;
    ends_at: string;
    cooldown_days?: number;
    description?: string;
}

export function useCreateCycle(teamId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CycleInput) => api.post<Cycle>(`/teams/${teamId}/cycles`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', teamId, 'cycles'] }),
    });
}

export function useUpdateCycle(teamId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...input }: { id: string; name?: string; starts_at?: string; ends_at?: string }) =>
            api.patch<Cycle>(`/cycles/${id}`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', teamId, 'cycles'] }),
    });
}

export function useDeleteCycle(teamId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/cycles/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', teamId, 'cycles'] }),
    });
}
