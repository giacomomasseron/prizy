import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { Milestone, Project, ProjectStatus } from '../../lib/types';

interface ProjectInput {
    name?: string;
    status?: ProjectStatus;
    team_id?: string | null;
    start_date?: string | null;
    target_date?: string | null;
    description?: string | null;
    icon?: string | null;
    color?: string;
}

export function useProjects() {
    return useQuery({ queryKey: ['projects'], queryFn: () => api.page<Project>('/projects') });
}

export function useCreateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: ProjectInput & { name: string }) => api.post<Project>('/projects', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    });
}

export function useUpdateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...input }: ProjectInput & { id: string }) => api.patch<Project>(`/projects/${id}`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    });
}

export function useDeleteProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/projects/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    });
}

export function useMilestones(projectId: string) {
    return useQuery({
        queryKey: ['projects', projectId, 'milestones'],
        queryFn: () => api.page<Milestone>(`/projects/${projectId}/milestones`),
        enabled: !!projectId,
    });
}

export function useCreateMilestone(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; target_date: string }) => api.post<Milestone>(`/projects/${projectId}/milestones`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'milestones'] }),
    });
}

export function useUpdateMilestone(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...input }: { id: string; name?: string; target_date?: string }) =>
            api.patch<Milestone>(`/milestones/${id}`, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'milestones'] }),
    });
}

export function useDeleteMilestone(projectId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/milestones/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId, 'milestones'] }),
    });
}
