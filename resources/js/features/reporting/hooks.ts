import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { AgentsReport, OverviewReport, SlaReport } from '../../lib/types';
import type { ReportRange } from './reportMeta';

export function useOverviewReport(range: ReportRange) {
    return useQuery({
        queryKey: ['report', 'overview', range],
        queryFn: () => api.get<OverviewReport>(`/reports/overview?range=${range}`),
        placeholderData: keepPreviousData,
    });
}

export function useAgentsReport(range: ReportRange, enabled: boolean) {
    return useQuery({
        queryKey: ['report', 'agents', range],
        queryFn: () => api.get<AgentsReport>(`/reports/agents?range=${range}`),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useSlaReport(range: ReportRange, enabled: boolean) {
    return useQuery({
        queryKey: ['report', 'sla', range],
        queryFn: () => api.get<SlaReport>(`/reports/sla?range=${range}`),
        placeholderData: keepPreviousData,
        enabled,
    });
}
