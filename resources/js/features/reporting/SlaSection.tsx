import { useSlaReport } from './hooks';
import { SlaAttainmentCard } from './SlaAttainmentCard';
import { BreachRiskCard } from './BreachRiskCard';
import type { ReportRange } from './reportMeta';

export function SlaSection({ range }: { range: ReportRange }) {
    const q = useSlaReport(range, true);
    const report = q.data;
    if (!report) {
        return <div style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</div>;
    }
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.35fr)', gap: 16 }}>
            <SlaAttainmentCard report={report} />
            <BreachRiskCard breachRisk={report.breach_risk} tags={report.tags} />
        </div>
    );
}
