import { sectionTitle } from '../issues/issueStyles';
import { bar, deskCard } from '../support/supportStyles';

export function BreakdownBars({ title, rows, labels }: { title: string; rows: { key: string; count: number }[]; labels: Record<string, string> }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <div style={{ ...deskCard, padding: '18px 20px' }}>
            <div style={{ ...sectionTitle(17), marginBottom: 14 }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((r) => (
                    <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ width: 92, fontSize: 12.5, color: 'var(--fg2)', flexShrink: 0 }}>{labels[r.key] ?? r.key}</span>
                        <div style={{ ...bar, flex: 1 }}>
                            <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--radius-pill)' }} />
                        </div>
                        <span style={{ width: 28, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)', flexShrink: 0 }}>{r.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
