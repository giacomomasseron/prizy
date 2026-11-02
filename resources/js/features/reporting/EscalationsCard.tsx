import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { OverviewReport } from '../../lib/types';
import { sectionTitle } from '../issues/issueStyles';
import { accentTag, cardSub, deskCard } from '../support/supportStyles';
import { issueRefFromId } from '../issues/issueMeta';

const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', borderRadius: 'var(--radius-row)', border: '1px solid var(--border)', background: 'var(--bg2)', textDecoration: 'none' };

export function EscalationsCard({ escalations }: { escalations: OverviewReport['escalations'] }) {
    return (
        <div style={{ ...deskCard, padding: '18px 20px' }}>
            <div style={sectionTitle(17)}>Escalations to engineering</div>
            <div style={{ ...cardSub, marginBottom: 14 }}>Tickets converted to PRZ issues</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1 }}>{escalations.count}</span>
                <span style={{ fontSize: 12.5, color: 'var(--fg2)' }}>of {escalations.created_total} created · {escalations.rate_pct}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {escalations.recent.map((e) => {
                    const label = <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</span>;
                    return e.issue_id ? (
                        <Link key={e.ticket_id} to={`/issues/${e.issue_id}`} style={rowStyle}>
                            {label}
                            <span style={accentTag}>↩ {issueRefFromId(e.issue_id)}</span>
                        </Link>
                    ) : (
                        <div key={e.ticket_id} style={rowStyle}>{label}</div>
                    );
                })}
            </div>
        </div>
    );
}
