import { useSlaReport } from './hooks';
import { SlaAttainmentCard } from './SlaAttainmentCard';
import { BreachRiskCard } from './BreachRiskCard';
import { QueryState } from '../../components/ui/QueryState';
import type { ReportRange } from './reportMeta';

export function SlaSection({ range }: { range: ReportRange }) {
    const q = useSlaReport(range, true);
    const report = q.data;
    return (
        <QueryState query={q} what="the SLA report">
            {report && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.35fr)', gap: 16 }}>
                    <SlaAttainmentCard report={report} />
                    <BreachRiskCard breachRisk={report.breach_risk} tags={report.tags} />
                </div>
            )}
        </QueryState>
    );
}
