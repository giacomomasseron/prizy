import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { RAIL_ACTIVE_CLASSES, RAIL_ITEM_CLASSES, SupportRail, railItem } from '../support/SupportRail';
import { paneHeader, paneSub, paneTitle } from '../support/supportStyles';
import { useOverviewReport, useAgentsReport, useSlaReport, useSavedReports, useCreateSavedReport, useDeleteSavedReport } from './hooks';
import { sectionCsv, toCsv, downloadCsv } from './csv';
import { KPI_META, type ReportRange, type ReportSectionKey, REPORT_SECTIONS } from './reportMeta';
import { KpiCard } from './KpiCard';
import { OverviewSection } from './OverviewSection';
import { AgentsSection } from './AgentsSection';
import { SlaSection } from './SlaSection';
import { ReportingSidebar } from './ReportingSidebar';
import { RangeToggle } from './RangeToggle';
import { useMe } from '../../auth/useAuth';
import { canWriteHelpdesk, trackerEnabled } from '../../auth/capabilities';

export default function ReportingLayout() {
    const [range, setRange] = useState<ReportRange>('7d');
    const [section, setSection] = useState<ReportSectionKey>('overview');
    const q = useOverviewReport(range);
    const report = q.data;
    const agentsQ = useAgentsReport(range, section === 'agents');
    const slaQ = useSlaReport(range, section === 'sla');
    const savedReportsQ = useSavedReports();
    const createReport = useCreateSavedReport();
    const deleteReport = useDeleteSavedReport();
    const me = useMe().data;
    const canWrite = canWriteHelpdesk(me); // saved reports are shared: a viewer opens them, nothing more
    const sectionLabel = REPORT_SECTIONS.find((s) => s.key === section)?.label ?? 'Overview';

    const cached = section === 'overview' ? q.data : section === 'agents' ? agentsQ.data : slaQ.data;
    const exportable = cached ? sectionCsv(section, cached, range) : null;
    const onExport = () => {
        if (exportable) downloadCsv(exportable.filename, toCsv(exportable.headers, exportable.rows));
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <SupportRail>
                <Link to="/support" title="Desk" aria-label="Desk" className={RAIL_ITEM_CLASSES} style={railItem}>⌂</Link>
                <Link to="/support/reporting" title="Reporting" aria-label="Reporting" aria-current="page" className={RAIL_ACTIVE_CLASSES} style={railItem}>📊</Link>
                <Link to="/support/kb" title="Knowledge base" aria-label="Knowledge base" className={RAIL_ITEM_CLASSES} style={railItem}>📚</Link>
            </SupportRail>

            <ReportingSidebar
                section={section}
                onSelectSection={setSection}
                savedReports={savedReportsQ.data ?? []}
                onSelectReport={(s, r) => { setSection(s); setRange(r); }}
                onSaveReport={canWrite ? (name) => createReport.mutate({ name, definition: { section, range } }) : undefined}
                onDeleteReport={canWrite ? (id) => deleteReport.mutate(id) : undefined}
            />

            <div style={{ flex: 1, minWidth: 640, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
                <header style={{ ...paneHeader, padding: '10px 22px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={paneTitle}>{sectionLabel}</div>
                        <div style={paneSub}>Last {range}</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={onExport} disabled={!exportable}>Export CSV</Button>
                    <RangeToggle range={range} onSelect={setRange} />
                </header>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 22 }}>
                    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
                        <QueryState query={q} what="the report">
                            {report && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
                                        {KPI_META.map((m) => <KpiCard key={m.key} meta={m} kpi={report.kpis[m.key]} series={report.sparklines?.[m.key]} />)}
                                    </div>
                                    {section === 'overview' ? <OverviewSection report={report} tracker={trackerEnabled(me)} /> : section === 'agents' ? <AgentsSection range={range} /> : <SlaSection range={range} />}
                                </>
                            )}
                        </QueryState>
                    </div>
                </div>
            </div>
        </div>
    );
}
