import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionPost } from '../../auth/useAuth';
import { api } from '../../lib/apiClient';

export interface WorkspaceMemberTeam {
    id: string;
    identifier: string;
    color: string;
    name: string;
}

export interface WorkspaceMember {
    id: string; // 'inv:UUID' for invited
    name: string;
    email: string;
    admin_level: 'owner' | 'admin' | 'member' | 'viewer';
    is_developer: boolean;
    is_agent: boolean;
    status: 'active' | 'invited';
    teams: WorkspaceMemberTeam[];
}

export function useWorkspaceMembers(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['workspace-members'],
        queryFn: () => api.get<WorkspaceMember[]>('/workspace/members'),
        enabled: options?.enabled ?? true,
    });
}

export function useUpdateMember() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: Partial<Pick<WorkspaceMember, 'admin_level' | 'is_developer' | 'is_agent'>> }) =>
            api.patch<WorkspaceMember>(`/members/${userId}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
    });
}

export function useRemoveMember() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => api.del(`/members/${userId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
    });
}

export function useCancelInvitation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (invId: string) => api.del(`/invitations/${invId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
    });
}

export function useInviteMember() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: {
            email: string;
            admin_level: 'admin' | 'member' | 'viewer';
            is_developer: boolean;
            is_agent: boolean;
        }) => sessionPost<{ invitation: object }>('/invitations', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
    });
}
