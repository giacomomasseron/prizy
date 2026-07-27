import type { CSSProperties } from 'react';
import { REPORT_SECTIONS, type ReportSectionKey } from './reportMeta';

const rowCss = (active: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.6, fontWeight: active ? 600 : 500, textAlign: 'left', fontFamily: 'inherit', color: active ? 'var(--sup)' : 'var(--fg2)', background: active ? 'var(--sup2)' : 'transparent' });

export function ReportingSidebar({ section, onSelectSection }: { section: ReportSectionKey; onSelectSection: (s: ReportSectionKey) => void }) {
    return (
        <aside style={{ width: 216, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '15px 16px 6px', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>Reporting</div>
            <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--fg3)' }}>Support analytics</div>
            <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' }}>Reports</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {REPORT_SECTIONS.map((s) => (
                    <button key={s.key} type="button" onClick={() => onSelectSection(s.key)} style={rowCss(section === s.key)} className={section === s.key ? '' : 'hover:bg-hover'}>
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{s.icon}</span>
                        <span style={{ flex: 1 }}>{s.label}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}
