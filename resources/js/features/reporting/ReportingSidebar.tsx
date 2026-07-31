import { useState, type CSSProperties } from 'react';
import { REPORT_SECTIONS, type ReportRange, type ReportSectionKey } from './reportMeta';
import type { HelpdeskSavedReport } from '../../lib/types';

const rowCss = (active: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.6, fontWeight: active ? 600 : 500, textAlign: 'left', fontFamily: 'inherit', color: active ? 'var(--sup)' : 'var(--fg2)', background: active ? 'var(--sup2)' : 'transparent' });
const sectionLabel: CSSProperties = { padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' };

export function ReportingSidebar({ section, onSelectSection, savedReports, onSelectReport, onDeleteReport, onSaveReport }: {
    section: ReportSectionKey;
    onSelectSection: (s: ReportSectionKey) => void;
    savedReports: HelpdeskSavedReport[];
    onSelectReport: (section: ReportSectionKey, range: ReportRange) => void;
    onDeleteReport: (id: string) => void;
    onSaveReport: (name: string) => void;
}) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');

    const submit = () => {
        const trimmed = name.trim();
        if (trimmed === '') return;
        onSaveReport(trimmed);
        setName('');
        setSaving(false);
    };

    return (
        <aside style={{ width: 216, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ padding: '15px 16px 6px', fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>Reporting</div>
            <div style={{ padding: '4px 16px 10px', fontSize: 11, color: 'var(--fg3)' }}>Support analytics</div>

            <div style={sectionLabel}>Reports</div>
            <div style={{ padding: '0 8px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {REPORT_SECTIONS.map((s) => (
                    <button key={s.key} type="button" onClick={() => onSelectSection(s.key)} style={rowCss(section === s.key)} className={section === s.key ? '' : 'hover:bg-hover'}>
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{s.icon}</span>
                        <span style={{ flex: 1 }}>{s.label}</span>
                    </button>
                ))}
            </div>

            <div style={sectionLabel}>Saved reports</div>
            <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {savedReports.map((sr) => (
                    <div key={sr.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="group">
                        <button type="button" onClick={() => onSelectReport(sr.definition.section, sr.definition.range)} style={{ ...rowCss(false), flex: 1 }} className="hover:bg-hover">
                            <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>☰</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sr.name}</span>
                        </button>
                        <button type="button" aria-label={`Delete report ${sr.name}`} onClick={() => onDeleteReport(sr.id)} style={{ border: 'none', background: 'transparent', color: 'var(--fg3)', cursor: 'pointer', padding: '2px 6px', fontSize: 13, fontFamily: 'inherit' }}>✕</button>
                    </div>
                ))}
                {saving ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 9px' }}>
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Report name" onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setSaving(false); setName(''); } }} style={{ fontSize: 12.5, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={submit} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--sup)', background: 'var(--sup2)', color: 'var(--sup)', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                            <button type="button" onClick={() => { setSaving(false); setName(''); }} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg2)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => setSaving(true)} style={{ ...rowCss(false), color: 'var(--fg3)' }} className="hover:bg-hover">
                        <span style={{ width: 15, display: 'inline-flex', justifyContent: 'center' }}>＋</span>
                        <span style={{ flex: 1 }}>+ Save report</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
