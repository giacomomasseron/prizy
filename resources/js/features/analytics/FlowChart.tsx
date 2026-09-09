import type { TrackerOverviewReport } from '../../lib/types';

export function FlowChart({ flow }: { flow: TrackerOverviewReport['flow'] }) {
    const max = Math.max(1, ...flow.created, ...flow.completed);
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Issue flow</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>Created vs. completed</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--blue)' }} />Created</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--green)' }} />Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 186, borderBottom: '1px solid var(--border)' }}>
                {flow.labels.map((label, i) => (
                    <div key={i} title={`${label} · ${flow.created[i]} created, ${flow.completed[i]} completed`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: '100%' }}>
                        <div style={{ width: '100%', height: `${(flow.created[i] / max) * 100}%`, minHeight: 2, background: 'var(--blue)', borderRadius: '4px 4px 0 0' }} />
                        <div style={{ width: '100%', height: `${(flow.completed[i] / max) * 100}%`, minHeight: 2, background: 'var(--green)', borderRadius: '4px 4px 0 0' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                {flow.labels.map((label, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 9.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</div>
                ))}
            </div>
        </div>
    );
}
