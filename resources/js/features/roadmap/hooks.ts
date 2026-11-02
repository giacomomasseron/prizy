import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { RoadmapProject } from '../../lib/types';

export function useRoadmap() {
    return useQuery({ queryKey: ['roadmap'], queryFn: () => api.get<RoadmapProject[]>('/roadmap') });
}
