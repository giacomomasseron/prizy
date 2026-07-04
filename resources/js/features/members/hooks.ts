import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';

export interface Member { id: string; name: string; }

export function useMembers() {
    return useQuery({
        queryKey: ['members'],
        queryFn: () => api.get<Member[]>('/members'),
    });
}
