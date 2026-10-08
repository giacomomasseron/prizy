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
import { Button } from '../../components/ui/Button';
import { PILL_CLASSES, pillBtn } from '../settings/settingsStyles';
import { paneHeader, paneSub, paneTitle } from '../support/supportStyles';

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
                {/* v2: the reporting header. The section name is a plain div; the rail owns the "Analytics" heading. */}
                <header style={{ ...paneHeader, padding: '10px 22px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={paneTitle}>{sectionLabel}</div>
                        <div style={paneSub}>{section === 'overview' ? `Last ${range}` : 'By team'}</div>
                    </div>
                    {section === 'overview' && <Button variant="secondary" size="sm" onClick={onExport} disabled={!exportable}>Export CSV</Button>}
                    {section === 'overview' && <RangeToggle range={range} onSelect={setRange} />}
                    <Link to="/" title="Back to tracker" aria-label="Back to tracker" style={{ ...pillBtn, textDecoration: 'none' }} className={PILL_CLASSES}>⌗ Tracker</Link>
                    {me.data && <Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={28} />}
                </header>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 22 }}>
                    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
                        {section === 'overview' && (q.data ? <OverviewSection report={q.data} /> : <div style={{ fontSize: 13, color: 'var(--fg3)' }}>Loading…</div>)}
                        {section === 'cycles' && <CyclesSection />}
                    </div>
                </div>
            </main>
        </div>
    );
}
