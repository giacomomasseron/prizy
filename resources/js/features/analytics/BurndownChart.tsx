import type { CycleReport } from '../../lib/types';

const W = 600; const H = 200; const PAD = 10;

export function BurndownChart({ burndown }: { burndown: NonNullable<CycleReport['burndown']> }) {
    const n = burndown.days.length;
    const maxY = Math.max(1, burndown.total_scope);
    const x = (i: number) => PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2);
    const y = (v: number) => H - PAD - (v / maxY) * (H - PAD * 2);
    const idealPoints = `${x(0)},${y(burndown.total_scope)} ${x(n - 1)},${y(0)}`;
    const actualPoints = burndown.days
        .map((d, i) => (d.remaining === null ? null : `${x(i)},${y(d.remaining)}`))
        .filter((p): p is string => p !== null)
        .join(' ');
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Burndown</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{burndown.name}</div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Burndown for ${burndown.name}`}>
                <polyline points={idealPoints} fill="none" stroke="var(--fg3)" strokeWidth="1.5" strokeDasharray="5 5" />
                <polyline points={actualPoints} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                <span>{burndown.starts_at}</span><span>{burndown.ends_at}</span>
            </div>
        </div>
    );
}
