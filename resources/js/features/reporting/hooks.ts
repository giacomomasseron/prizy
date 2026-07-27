import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { OverviewReport } from '../../lib/types';
import type { ReportRange } from './reportMeta';

export function useOverviewReport(range: ReportRange) {
    return useQuery({
        queryKey: ['report', 'overview', range],
        queryFn: () => api.get<OverviewReport>(`/reports/overview?range=${range}`),
        placeholderData: keepPreviousData,
    });
}
