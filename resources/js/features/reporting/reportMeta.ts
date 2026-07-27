import type { OverviewReport } from '../../lib/types';

export type ReportRange = '7d' | '30d' | '90d';
export type ReportSectionKey = 'overview' | 'agents' | 'sla';

export const REPORT_RANGES: { key: ReportRange; label: string }[] = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
];

export const REPORT_SECTIONS: { key: ReportSectionKey; icon: string; label: string }[] = [
    { key: 'overview', icon: '◫', label: 'Overview' },
    { key: 'agents', icon: '☺', label: 'Agents & CSAT' },
    { key: 'sla', icon: '◷', label: 'SLA & channels' },
];

export interface KpiMeta {
    key: keyof OverviewReport['kpis'];
    label: string;
    unit: string;
    positiveIsGood: boolean;
}

export const KPI_META: KpiMeta[] = [
    { key: 'tickets_created', label: 'Tickets created', unit: '', positiveIsGood: true },
    { key: 'solved', label: 'Solved', unit: '', positiveIsGood: true },
    { key: 'median_first_reply_minutes', label: 'Median first reply', unit: 'min', positiveIsGood: false },
    { key: 'csat', label: 'CSAT', unit: '%', positiveIsGood: true },
];
