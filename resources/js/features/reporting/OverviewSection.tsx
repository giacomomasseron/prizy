import { VolumeChart } from './VolumeChart';
import { StatusBreakdown } from './StatusBreakdown';
import { EscalationsCard } from './EscalationsCard';
import type { OverviewReport } from '../../lib/types';

export function OverviewSection({ report }: { report: OverviewReport }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16 }}>
            <VolumeChart buckets={report.volume} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <StatusBreakdown byStatus={report.by_status} />
                <EscalationsCard escalations={report.escalations} />
            </div>
        </div>
    );
}
