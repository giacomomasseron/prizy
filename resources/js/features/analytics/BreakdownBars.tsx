export function BreakdownBars({ title, rows, labels }: { title: string; rows: { key: string; count: number }[]; labels: Record<string, string> }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((r) => (
                    <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 92, fontSize: 11.5, color: 'var(--fg2)', flexShrink: 0 }}>{labels[r.key] ?? r.key}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg2)', overflow: 'hidden' }}>
                            <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
                        </div>
                        <span style={{ width: 28, textAlign: 'right', fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--fg2)' }}>{r.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
