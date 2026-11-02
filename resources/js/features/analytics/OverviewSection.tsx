import type { TrackerOverviewReport } from '../../lib/types';
import { KpiCard } from '../reporting/KpiCard';
import { formatDuration } from '../reporting/formatDuration';
import { FlowChart } from './FlowChart';
import { BreakdownBars } from './BreakdownBars';
import { PRIORITY_LABELS, STATUS_LABELS, TRACKER_KPI_META } from './analyticsMeta';

export function OverviewSection({ report }: { report: TrackerOverviewReport }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {TRACKER_KPI_META.map((m) => (
                    <KpiCard key={m.key} meta={m} kpi={report.kpis[m.key]}
                        series={m.key === 'created' ? report.sparklines.created : m.key === 'completed' ? report.sparklines.completed : undefined}
                        format={m.key === 'median_cycle_time_minutes' ? formatDuration : undefined} />
                ))}
            </div>
            <FlowChart flow={report.flow} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <BreakdownBars title="By status" rows={report.by_status} labels={STATUS_LABELS} />
                <BreakdownBars title="By priority" rows={report.by_priority} labels={PRIORITY_LABELS} />
            </div>
        </div>
    );
}
