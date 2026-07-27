import type { VolumeBucket } from '../../lib/types';

export function VolumeChart({ buckets }: { buckets: VolumeBucket[] }) {
    const max = Math.max(1, ...buckets.map((b) => Math.max(b.created, b.solved)));
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Ticket volume</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>Created vs. solved</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--blue)' }} />Created</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--sup)' }} />Solved</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 186, borderBottom: '1px solid var(--border)' }}>
                {buckets.map((b, i) => (
                    <div key={i} title={`${b.label} · ${b.created} created, ${b.solved} solved`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: '100%' }}>
                        <div style={{ width: '100%', height: `${(b.created / max) * 100}%`, minHeight: 2, background: 'var(--blue)', borderRadius: '4px 4px 0 0' }} />
                        <div style={{ width: '100%', height: `${(b.solved / max) * 100}%`, minHeight: 2, background: 'var(--sup)', borderRadius: '4px 4px 0 0' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                {buckets.map((b, i) => (
                    <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 9.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</div>
                ))}
            </div>
        </div>
    );
}
