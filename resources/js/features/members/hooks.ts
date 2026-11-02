import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';

export interface Member { id: string; name: string; is_agent: boolean; }

export function useMembers() {
    return useQuery({
        queryKey: ['members'],
        queryFn: () => api.get<Member[]>('/members'),
    });
}
