import type { VelocityRow } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { deskCard } from '../support/supportStyles';

export function VelocityTable({ rows, selectedId, onSelect }: { rows: VelocityRow[]; selectedId: string | null; onSelect: (id: string) => void }) {
    return (
        <div style={{ ...deskCard, padding: '18px 20px' }}>
            <div style={{ ...sectionTitle(17), marginBottom: 12 }}>Velocity</div>
            {rows.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg3)' }}>No cycles yet</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rows.map((c) => {
                    const pct = c.total_count > 0 ? Math.round((c.completed_count / c.total_count) * 100) : 0;
                    const active = c.id === selectedId;
                    return (
                        // Selected: tinted with a ring (the card is already white). Unselected rows hover through classes.
                        <button key={c.id} type="button" onClick={() => onSelect(c.id)} aria-pressed={active}
                            className={active ? '' : 'bg-transparent hover:bg-hover'}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius-row)', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'var(--fg)', ...(active ? { background: 'var(--bg2)', boxShadow: 'inset 0 0 0 1.5px var(--border2)' } : {}) }}>
                            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{c.starts_at} → {c.ends_at}</span>
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.completed_count}/{c.total_count}</span>
                            <span style={{ width: 40, textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: pct >= 70 ? 'var(--green-ink)' : 'var(--fg2)' }}>{pct}%</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
