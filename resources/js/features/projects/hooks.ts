import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { IssuePriority, Milestone, Project, ProjectStatus } from '../../lib/types';

interface ProjectInput {
    name?: string;
    status?: ProjectStatus;
    team_id?: string | null;
    start_date?: string | null;
    target_date?: string | null;
    description?: string | null;
    icon?: string | null;
    color?: string;
    lead_id?: string | null;
    priority?: IssuePriority;
}

export function useProjects(filters?: { team_id?: string }, options?: { enabled?: boolean }) {
    const teamId = filters?.team_id;
    return useQuery({
        queryKey: ['projects', filters ?? {}],
        queryFn: () => api.page<Project>(teamId ? `/projects?filter[team_id]=${encodeURIComponent(teamId)}` : '/projects'),
        enabled: options?.enabled,
    });
}

export const MY_PROJECTS_KEY = ['projects', { mine: true }] as const;

/**
 * Today v2's left bar: your active projects, the ones you lead or that hold open work of yours, your plan included
 * (GET /v1/projects?filter[mine]=true, not completed or cancelled). Plan writes refresh it.
 */
export function useMyProjects(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: MY_PROJECTS_KEY,
        queryFn: () => api.page<Project>('/projects?filter[mine]=true&filter[status]=planning,in_progress,paused&limit=50'),
        enabled: options?.enabled,
    });
}

export function useProject(id: string) {
    return useQuery({
        queryKey: ['project', id],
        queryFn: () => api.get<Project>(`/projects/${id}`),
        enabled: !!id,
    });
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
