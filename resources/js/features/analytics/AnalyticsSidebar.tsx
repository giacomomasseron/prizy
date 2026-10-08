import { NAV_ROW_HOVER } from '../../components/sidebarStyles';
import { sideFrame, sideRow, sideSection, sideSub, sideTitle } from '../support/supportStyles';
import { ANALYTICS_SECTIONS, type AnalyticsSectionKey } from './analyticsMeta';

/** v2: the reporting sidebar's look. It holds the page's only "Analytics" heading. */
export function AnalyticsSidebar({ section, onSelectSection }: { section: AnalyticsSectionKey; onSelectSection: (s: AnalyticsSectionKey) => void }) {
    return (
        <nav aria-label="Analytics sections" style={sideFrame}>
            <h1 style={{ ...sideTitle, margin: 0 }}>Analytics</h1>
            <div style={sideSub}>Issues and cycles</div>
            <div style={sideSection}>Reports</div>
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ANALYTICS_SECTIONS.map((s) => {
                    const active = s.key === section;
                    return (
                        <button key={s.key} type="button" onClick={() => onSelectSection(s.key)} aria-pressed={active} style={sideRow(active)} className={active ? '' : NAV_ROW_HOVER}>
                            <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center', color: 'var(--fg3)' }}>{s.icon}</span>{s.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
