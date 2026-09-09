import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { CycleReport, TrackerOverviewReport } from '../../lib/types';
import type { ReportRange } from '../reporting/reportMeta';

export function useTrackerOverview(range: ReportRange) {
    return useQuery({
        queryKey: ['report', 'tracker-overview', range],
        queryFn: () => api.get<TrackerOverviewReport>(`/reports/tracker-overview?range=${range}`),
        placeholderData: keepPreviousData,
    });
}

export function useCycleReport(teamId: string, cycleId: string | null) {
    return useQuery({
        queryKey: ['report', 'cycles', teamId, cycleId],
        queryFn: () => api.get<CycleReport>(`/reports/cycles?team_id=${teamId}${cycleId ? `&cycle_id=${cycleId}` : ''}`),
        placeholderData: keepPreviousData,
        enabled: !!teamId,
    });
}
