import { VolumeChart } from './VolumeChart';
import { StatusBreakdown } from './StatusBreakdown';
import { EscalationsCard } from './EscalationsCard';
import type { OverviewReport } from '../../lib/types';

/** `tracker`: whether the workspace runs the tracker, which escalations go to; without it there are none to show or link to. */
export function OverviewSection({ report, tracker = true }: { report: OverviewReport; tracker?: boolean }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 16 }}>
            <VolumeChart buckets={report.volume} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <StatusBreakdown byStatus={report.by_status} />
                {tracker && <EscalationsCard escalations={report.escalations} />}
            </div>
        </div>
    );
}
