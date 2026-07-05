import { useQuery } from '@tanstack/react-query';
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

export function useWorkspaceMembers() {
    return useQuery({
        queryKey: ['workspace-members'],
        queryFn: () => api.get<WorkspaceMember[]>('/workspace/members'),
    });
}
