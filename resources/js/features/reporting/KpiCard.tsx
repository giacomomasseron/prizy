import type { CSSProperties } from 'react';
import type { Kpi } from '../../lib/types';
import type { KpiMeta } from './reportMeta';

const card: CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, padding: '15px 16px', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 9 };

export function KpiCard({ meta, kpi }: { meta: KpiMeta; kpi: Kpi }) {
    const neutral = kpi.delta_pct === 0;
    const good = !neutral && kpi.delta_pct !== null && (kpi.delta_pct > 0) === meta.positiveIsGood;
    const color = neutral ? 'var(--fg3)' : good ? 'var(--green)' : 'var(--red)';
    const bg = neutral ? 'rgba(255,255,255,.06)' : good ? 'rgba(75,171,102,.14)' : 'rgba(235,87,87,.14)';
    return (
        <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--fg2)', flex: 1 }}>{meta.label}</span>
                {kpi.delta_pct !== null && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 20, color, background: bg, fontFamily: 'var(--font-mono)' }}>
                        {kpi.delta_pct > 0 ? '+' : ''}{kpi.delta_pct}%
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 29, fontWeight: 600, lineHeight: 1, color: 'var(--fg)' }}>{kpi.value ?? '—'}</span>
                {kpi.value !== null && meta.unit !== '' && <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{meta.unit}</span>}
            </div>
        </div>
    );
}
