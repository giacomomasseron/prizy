import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { RangeToggle } from '../reporting/RangeToggle';
import type { ReportRange } from '../reporting/reportMeta';
import { downloadCsv, toCsv } from '../reporting/csv';
import { useTrackerOverview } from './hooks';
import { AnalyticsSidebar } from './AnalyticsSidebar';
import { OverviewSection } from './OverviewSection';
import { CyclesSection } from './CyclesSection';
import { analyticsCsv } from './csv';
import { ANALYTICS_SECTIONS, type AnalyticsSectionKey } from './analyticsMeta';

export default function AnalyticsLayout() {
    const me = useMe();
    const [range, setRange] = useState<ReportRange>('7d');
    const [section, setSection] = useState<AnalyticsSectionKey>('overview');
    const q = useTrackerOverview(range);
    const sectionLabel = ANALYTICS_SECTIONS.find((s) => s.key === section)?.label ?? 'Overview';

    const exportable = section === 'overview' && q.data ? analyticsCsv(q.data, range) : null;
    const onExport = () => { if (exportable) downloadCsv(exportable.filename, toCsv(exportable.headers, exportable.rows)); };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <AnalyticsSidebar section={section} onSelectSection={setSection} />
            <main style={{ flex: 1, minWidth: 640, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
                <header style={{ minHeight: 52, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 22px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Analytics</h1>
                        <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{sectionLabel}</div>
                    </div>
                    {section === 'overview' && <RangeToggle range={range} onSelect={setRange} />}
                    {section === 'overview' && (
                        <button type="button" onClick={onExport} disabled={!exportable}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--panel)', color: exportable ? 'var(--fg)' : 'var(--fg3)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: exportable ? 'pointer' : 'default' }}>
                            Export CSV
                        </button>
                    )}
                    <Link to="/" title="Back to tracker" aria-label="Back to tracker" style={{ fontSize: 12.5, color: 'var(--fg2)', textDecoration: 'none' }}>⌗ Tracker</Link>
                    {me.data && <Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={28} />}
                </header>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18 }}>
                    {section === 'overview' && (q.data ? <OverviewSection report={q.data} /> : <div style={{ fontSize: 12.5, color: 'var(--fg3)' }}>Loading…</div>)}
                    {section === 'cycles' && <CyclesSection />}
                </div>
            </main>
        </div>
    );
}
