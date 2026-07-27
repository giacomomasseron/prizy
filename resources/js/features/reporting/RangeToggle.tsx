import { REPORT_RANGES, type ReportRange } from './reportMeta';

export function RangeToggle({ range, onSelect }: { range: ReportRange; onSelect: (r: ReportRange) => void }) {
    return (
        <div style={{ display: 'flex', gap: 2, padding: 3, border: '1px solid var(--border2)', borderRadius: 9, background: 'var(--panel)' }}>
            {REPORT_RANGES.map((r) => {
                const active = r.key === range;
                return (
                    <button key={r.key} type="button" onClick={() => onSelect(r.key)} aria-pressed={active}
                        style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: active ? 'var(--sup2)' : 'transparent', color: active ? 'var(--sup)' : 'var(--fg3)' }}>
                        {r.label}
                    </button>
                );
            })}
        </div>
    );
}
