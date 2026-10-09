import { REPORT_RANGES, type ReportRange } from './reportMeta';

/** 7d / 30d / 90d — styled like the shared SegmentedControl, but keeps aria-pressed. */
export function RangeToggle({ range, onSelect }: { range: ReportRange; onSelect: (r: ReportRange) => void }) {
    return (
        <div style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--bg2)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)' }}>
            {REPORT_RANGES.map((r) => {
                const active = r.key === range;
                return (
                    <button key={r.key} type="button" onClick={() => onSelect(r.key)} aria-pressed={active}
                        style={{ padding: '5px 12px', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', background: active ? 'var(--panel)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg2)', boxShadow: active ? '0 0 0 1.5px var(--field)' : 'none' }}>
                        {r.label}
                    </button>
                );
            })}
        </div>
    );
}
