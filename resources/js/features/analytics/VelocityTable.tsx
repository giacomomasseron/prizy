import type { VelocityRow } from '../../lib/types';

export function VelocityTable({ rows, selectedId, onSelect }: { rows: VelocityRow[]; selectedId: string | null; onSelect: (id: string) => void }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Velocity</div>
            {rows.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg3)' }}>No cycles yet</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rows.map((c) => {
                    const pct = c.total_count > 0 ? Math.round((c.completed_count / c.total_count) * 100) : 0;
                    const active = c.id === selectedId;
                    return (
                        <button key={c.id} type="button" onClick={() => onSelect(c.id)} aria-pressed={active}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--accent)' : 'transparent'), background: active ? 'var(--accent2)' : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--fg)' }}>
                            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{c.starts_at} → {c.ends_at}</span>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.completed_count}/{c.total_count}</span>
                            <span style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 600, color: pct >= 70 ? 'var(--green)' : 'var(--fg2)' }}>{pct}%</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
