import type { TrackerOverviewReport } from '../../lib/types';
import type { ReportRange } from '../reporting/reportMeta';
import { TRACKER_KPI_META } from './analyticsMeta';

// v1 exports the Overview section only (the export button is hidden on Cycles);
// a cycles CSV can be added when the section grows a stable tabular shape.
export function analyticsCsv(data: TrackerOverviewReport, range: ReportRange):
    { filename: string; headers: string[]; rows: (string | number | null)[][] } {
    return {
        filename: `tracker-overview-${range}.csv`,
        headers: ['Metric', 'Value', 'Delta %'],
        rows: TRACKER_KPI_META.map((m) => [m.label, data.kpis[m.key].value, data.kpis[m.key].delta_pct]),
    };
}
