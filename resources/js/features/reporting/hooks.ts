import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { AgentsReport, HelpdeskSavedReport, OverviewReport, SlaReport } from '../../lib/types';
import type { ReportRange, ReportSectionKey } from './reportMeta';

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

export function useSavedReports() {
    return useQuery({ queryKey: ['reporting', 'saved-reports'], queryFn: () => api.get<HelpdeskSavedReport[]>('/report-views') });
}

export function useCreateSavedReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { name: string; definition: { section: ReportSectionKey; range: ReportRange } }) =>
            api.post<HelpdeskSavedReport>('/report-views', input),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['reporting', 'saved-reports'] }); },
    });
}

export function useDeleteSavedReport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del(`/report-views/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['reporting', 'saved-reports'] }); },
    });
}
