import type { CSSProperties } from 'react';
import type { Kpi } from '../../lib/types';
import { Sparkline } from './Sparkline';
import { deskCard, smallLabel, tint } from '../support/supportStyles';

export interface KpiDisplayMeta { label: string; unit: string; positiveIsGood: boolean }

const card: CSSProperties = { ...deskCard, padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 9 };

export function KpiCard<M extends KpiDisplayMeta>({ meta, kpi, series, format }: { meta: M; kpi: Kpi; series?: (number | null)[]; format?: (v: number) => string }) {
    const neutral = kpi.delta_pct === 0;
    const good = !neutral && kpi.delta_pct !== null && (kpi.delta_pct > 0) === meta.positiveIsGood;
    const color = neutral ? 'var(--fg3)' : good ? 'var(--green)' : 'var(--red)';
    const sparkColor = kpi.delta_pct === null ? 'var(--fg3)' : color;
    const bg = neutral ? 'var(--hover)' : good ? tint('var(--green)', 14) : tint('var(--red)', 14);
    return (
        <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...smallLabel, flex: 1 }}>{meta.label}</span>
                {kpi.delta_pct !== null && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', color, background: bg, fontFamily: 'var(--font-mono)' }}>
                        {kpi.delta_pct > 0 ? '+' : ''}{kpi.delta_pct}%
                    </span>
                )}
            </div>
            {series && <Sparkline series={series} color={sparkColor} />}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--fg)' }}>{kpi.value === null ? '—' : format ? format(kpi.value) : kpi.value}</span>
                {kpi.value !== null && !format && meta.unit !== '' && <span style={{ fontSize: 12.5, color: 'var(--fg3)' }}>{meta.unit}</span>}
            </div>
        </div>
    );
}
