import { useAgentsReport } from './hooks';
import { AgentPerformanceTable } from './AgentPerformanceTable';
import { RepliesPerDayChart } from './RepliesPerDayChart';
import { SatisfactionCard } from './SatisfactionCard';
import type { ReportRange } from './reportMeta';

export function AgentsSection({ range }: { range: ReportRange }) {
    const q = useAgentsReport(range, true);
    const report = q.data;
    if (!report) {
        return <div style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</div>;
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AgentPerformanceTable agents={report.agents} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>
                <RepliesPerDayChart buckets={report.replies_per_day} />
                <SatisfactionCard csat={report.csat} />
            </div>
        </div>
    );
}
