import type { AgentsReport } from '../../lib/types';

const COLORS: Record<string, string> = { positive: 'var(--green)', negative: 'var(--red)' };

export function SatisfactionCard({ csat }: { csat: AgentsReport['csat'] }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Satisfaction</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 16 }}>{csat.responses} rated conversations</div>
            {csat.responses === 0 ? (
                <div style={{ color: 'var(--fg3)', fontSize: 12.5 }}>No ratings in this range.</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {csat.breakdown.map((c) => (
                        <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <span style={{ width: 74, fontSize: 12, color: 'var(--fg2)', flexShrink: 0 }}>{c.label}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${c.pct}%`, background: COLORS[c.key], borderRadius: 5 }} />
                            </div>
                            <span style={{ width: 38, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, flexShrink: 0 }}>{c.pct}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
