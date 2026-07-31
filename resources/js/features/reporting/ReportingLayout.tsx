import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { useOverviewReport, useAgentsReport, useSlaReport, useSavedReports, useCreateSavedReport, useDeleteSavedReport } from './hooks';
import { sectionCsv, toCsv, downloadCsv } from './csv';
import { KPI_META, type ReportRange, type ReportSectionKey, REPORT_SECTIONS } from './reportMeta';
import { KpiCard } from './KpiCard';
import { OverviewSection } from './OverviewSection';
import { AgentsSection } from './AgentsSection';
import { SlaSection } from './SlaSection';
import { ReportingSidebar } from './ReportingSidebar';
import { RangeToggle } from './RangeToggle';

const railIcon: CSSProperties = { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--fg3)', textDecoration: 'none' };

export default function ReportingLayout() {
    const me = useMe();
    const [range, setRange] = useState<ReportRange>('7d');
    const [section, setSection] = useState<ReportSectionKey>('overview');
    const q = useOverviewReport(range);
    const report = q.data;
    const agentsQ = useAgentsReport(range, section === 'agents');
    const slaQ = useSlaReport(range, section === 'sla');
    const savedReportsQ = useSavedReports();
    const createReport = useCreateSavedReport();
    const deleteReport = useDeleteSavedReport();
    const sectionLabel = REPORT_SECTIONS.find((s) => s.key === section)?.label ?? 'Overview';

    const cached = section === 'overview' ? q.data : section === 'agents' ? agentsQ.data : slaQ.data;
    const exportable = cached ? sectionCsv(section, cached, range) : null;
    const onExport = () => {
        if (exportable) downloadCsv(exportable.filename, toCsv(exportable.headers, exportable.rows));
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            {/* icon rail */}
            <div style={{ width: 56, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6 }}>
                <Link to="/support" style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--sup),#5cc78c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8, textDecoration: 'none' }}>P</Link>
                <Link to="/support" title="Desk" aria-label="Desk" style={railIcon}>⌂</Link>
                <Link to="/support/reporting" title="Reporting" aria-label="Reporting" style={{ ...railIcon, background: 'var(--sup2)', color: 'var(--sup)' }}>📊</Link>
                <div style={{ flex: 1 }} />
                <Link to="/" title="Switch to Engineering" aria-label="Switch to Engineering" style={{ ...railIcon, border: '1px solid var(--border2)' }}>⌗</Link>
                {me.data && <span style={{ marginTop: 6 }}><Avatar {...avatarFor({ id: me.data.id, name: me.data.name })} size={30} /></span>}
            </div>

            <ReportingSidebar
                section={section}
                onSelectSection={setSection}
                savedReports={savedReportsQ.data ?? []}
                onSelectReport={(s, r) => { setSection(s); setRange(r); }}
                onSaveReport={(name) => createReport.mutate({ name, definition: { section, range } })}
                onDeleteReport={(id) => deleteReport.mutate(id)}
            />

            <main style={{ flex: 1, minWidth: 640, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
                <header style={{ minHeight: 52, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 22px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>{sectionLabel}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>Last {range}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={!exportable}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--panel)', color: exportable ? 'var(--fg2)' : 'var(--fg3)', cursor: exportable ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
                    >
                        Export CSV
                    </button>
                    <RangeToggle range={range} onSelect={setRange} />
                </header>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 22 }}>
                    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
                        {!report ? (
                            <div style={{ color: 'var(--fg3)', fontSize: 13 }}>Loading…</div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12 }}>
                                    {KPI_META.map((m) => <KpiCard key={m.key} meta={m} kpi={report.kpis[m.key]} series={report.sparklines?.[m.key]} />)}
                                </div>
                                {section === 'overview' ? <OverviewSection report={report} /> : section === 'agents' ? <AgentsSection range={range} /> : <SlaSection range={range} />}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
