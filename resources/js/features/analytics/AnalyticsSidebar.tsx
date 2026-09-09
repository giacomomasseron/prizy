import { ANALYTICS_SECTIONS, type AnalyticsSectionKey } from './analyticsMeta';

export function AnalyticsSidebar({ section, onSelectSection }: { section: AnalyticsSectionKey; onSelectSection: (s: AnalyticsSectionKey) => void }) {
    return (
        <nav aria-label="Analytics sections" style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg2)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--fg3)', padding: '0 8px 8px' }}>Analytics</div>
            {ANALYTICS_SECTIONS.map((s) => {
                const active = s.key === section;
                return (
                    <button key={s.key} type="button" onClick={() => onSelectSection(s.key)} aria-pressed={active}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 600 : 500, fontFamily: 'inherit', textAlign: 'left', background: active ? 'var(--accent2)' : 'transparent', color: active ? 'var(--accent)' : 'var(--fg2)' }}>
                        <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>{s.icon}</span>{s.label}
                    </button>
                );
            })}
        </nav>
    );
}
