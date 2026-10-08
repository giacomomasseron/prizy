import type { TrackerOverviewReport } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { cardSub, deskCard } from '../support/supportStyles';

export function FlowChart({ flow }: { flow: TrackerOverviewReport['flow'] }) {
    const max = Math.max(1, ...flow.created, ...flow.completed);
    return (
        <div style={{ ...deskCard, padding: '18px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={sectionTitle(17)}>Issue flow</div>
                    <div style={cardSub}>Created vs. completed</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--blue)' }} />Created</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--green)' }} />Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 186, borderBottom: '1px solid var(--border)' }}>
                {flow.labels.map((label, i) => (
                    <div key={i} title={`${label} · ${flow.created[i]} created, ${flow.completed[i]} completed`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: '100%' }}>
                        <div style={{ width: '100%', height: `${(flow.created[i] / max) * 100}%`, minHeight: 2, background: 'var(--blue)', borderRadius: '6px 6px 0 0' }} />
                        <div style={{ width: '100%', height: `${(flow.completed[i] / max) * 100}%`, minHeight: 2, background: 'var(--green)', borderRadius: '6px 6px 0 0' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                {flow.labels.map((label, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</div>
                ))}
            </div>
        </div>
    );
}
