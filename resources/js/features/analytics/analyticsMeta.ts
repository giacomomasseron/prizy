import type { KpiDisplayMeta } from '../reporting/KpiCard';
import type { TrackerOverviewReport } from '../../lib/types';

export type AnalyticsSectionKey = 'overview' | 'cycles';

export const ANALYTICS_SECTIONS: { key: AnalyticsSectionKey; icon: string; label: string }[] = [
    { key: 'overview', icon: '◫', label: 'Overview' },
    { key: 'cycles', icon: '↻', label: 'Cycles' },
];

export interface TrackerKpiMeta extends KpiDisplayMeta { key: keyof TrackerOverviewReport['kpis'] }

export const TRACKER_KPI_META: TrackerKpiMeta[] = [
    { key: 'created', label: 'Issues created', unit: '', positiveIsGood: true },
    { key: 'completed', label: 'Issues completed', unit: '', positiveIsGood: true },
    { key: 'active', label: 'Active issues', unit: '', positiveIsGood: true },
    { key: 'median_cycle_time_minutes', label: 'Median cycle time', unit: 'min', positiveIsGood: false },
];

export const STATUS_LABELS: Record<string, string> = {
    backlog: 'Backlog', todo: 'Todo', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<string, string> = {
    no_priority: 'No priority', urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
};
