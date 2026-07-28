import type { RepliesBucket } from '../../lib/types';

export function RepliesPerDayChart({ buckets }: { buckets: RepliesBucket[] }) {
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Replies per day</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 16 }}>Public replies + internal notes</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, borderBottom: '1px solid var(--border)' }}>
                {buckets.map((b, i) => (
                    <div key={i} title={`${b.label} · ${b.count} replies`} style={{ flex: 1, minWidth: 0, height: `${(b.count / max) * 100}%`, minHeight: 2, background: 'var(--sup)', opacity: 0.75, borderRadius: '4px 4px 0 0' }} />
                ))}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                {buckets.map((b, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 9.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</div>
                ))}
            </div>
        </div>
    );
}
