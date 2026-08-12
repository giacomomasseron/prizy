import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Cycle, Team } from '../../lib/types';

export function useTeams(options?: { enabled?: boolean; mine?: boolean }) {
    const mine = options?.mine ?? false;
    return useQuery({
        queryKey: mine ? ['teams', { mine: true }] : ['teams'],
        queryFn: () => api.page<Team>(mine ? '/teams?mine=1' : '/teams'),
        enabled: options?.enabled ?? true,
    });
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
export function useCycles(teamId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['teams', teamId, 'cycles'],
        queryFn: () => api.page<Cycle>(`/teams/${teamId}/cycles`),
        enabled: !!teamId && (options?.enabled ?? true),
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
        mutationFn: ({ id, ...input }: { id: string; name?: string; starts_at?: string; ends_at?: string; cooldown_days?: number; description?: string }) =>
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

// --- team members ---

export interface TeamMemberRow {
    id: string;
    name: string;
    email: string;
    role: 'lead' | 'member';
}

export function useTeamMembers(teamId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['team', teamId, 'members'],
        queryFn: () => api.get<TeamMemberRow[]>(`/teams/${teamId}/members`),
        enabled: (options?.enabled ?? true) && !!teamId,
    });
}

function invalidateTeam(qc: ReturnType<typeof useQueryClient>, teamId: string) {
    qc.invalidateQueries({ queryKey: ['team', teamId, 'members'] });
    qc.invalidateQueries({ queryKey: ['teams'] });
}

export function useAddTeamMember(teamId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { user_id: string; role?: 'lead' | 'member' }) =>
            api.post<TeamMemberRow>(`/teams/${teamId}/members`, input),
        onSuccess: () => invalidateTeam(qc, teamId),
    });
}

export function useSetTeamMemberRole(teamId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: 'lead' | 'member' }) =>
            api.patch<TeamMemberRow>(`/teams/${teamId}/members/${userId}`, { role }),
        onSuccess: () => invalidateTeam(qc, teamId),
    });
}

export function useRemoveTeamMember(teamId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => api.del(`/teams/${teamId}/members/${userId}`),
        onSuccess: () => invalidateTeam(qc, teamId),
    });
}
