import { useState, type CSSProperties } from 'react';
import { REPORT_SECTIONS, type ReportRange, type ReportSectionKey } from './reportMeta';
import { sideFrame, sideRow, sideSection, sideSub, sideTitle } from '../support/supportStyles';
import { NAV_ROW_HOVER } from '../../components/sidebarStyles';
import { DELETE_X_CLASSES, deleteXStyle } from '../projects/projectStyles';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { HelpdeskSavedReport } from '../../lib/types';

// The icon stays readable (not aria-hidden): it is part of each row's name ("◫ Overview"), which e2e relies on.
const icon: CSSProperties = { width: 16, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' };
const rowList: CSSProperties = { padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 1 };

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
        <aside style={sideFrame}>
            <div style={sideTitle}>Reporting</div>
            <div style={sideSub}>Support analytics</div>

            <div style={sideSection}>Reports</div>
            <div style={rowList}>
                {REPORT_SECTIONS.map((s) => (
                    <button key={s.key} type="button" onClick={() => onSelectSection(s.key)} style={sideRow(section === s.key)} className={section === s.key ? '' : NAV_ROW_HOVER}>
                        <span style={icon}>{s.icon}</span>
                        <span style={{ flex: 1 }}>{s.label}</span>
                    </button>
                ))}
            </div>

            <div style={sideSection}>Saved reports</div>
            <div style={rowList}>
                {savedReports.map((sr) => (
                    <div key={sr.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="group">
                        <button type="button" onClick={() => onSelectReport(sr.definition.section, sr.definition.range)} style={{ ...sideRow(false), flex: 1, minWidth: 0 }} className={NAV_ROW_HOVER}>
                            <span style={icon}>☰</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sr.name}</span>
                        </button>
                        <button type="button" aria-label={`Delete report ${sr.name}`} onClick={() => onDeleteReport(sr.id)} className={DELETE_X_CLASSES} style={{ ...deleteXStyle, fontSize: 13 }}>✕</button>
                    </div>
                ))}
                {saving ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 4px' }}>
                        <Input autoFocus aria-label="Report name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Report name" onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setSaving(false); setName(''); } }} style={{ padding: '6px 12px', fontSize: 13 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <Button size="sm" onClick={submit}>Save</Button>
                            <Button variant="secondary" size="sm" onClick={() => { setSaving(false); setName(''); }}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => setSaving(true)} style={{ ...sideRow(false), color: 'var(--fg3)' }} className={NAV_ROW_HOVER}>
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>＋</span>
                        <span style={{ flex: 1 }}>+ Save report</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
