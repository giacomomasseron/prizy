import { Link } from 'react-router-dom';
import type { OverviewReport } from '../../lib/types';

export function EscalationsCard({ escalations }: { escalations: OverviewReport['escalations'] }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Escalations to engineering</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 14 }}>Tickets converted to PRZ issues</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{escalations.count}</span>
                <span style={{ fontSize: 11.5, color: 'var(--fg2)' }}>of {escalations.created_total} created · {escalations.rate_pct}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {escalations.recent.map((e) => (
                    <Link key={e.ticket_id} to={e.issue_id ? `/issues/${e.issue_id}` : '#'} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', textDecoration: 'none' }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subject}</span>
                        {e.issue_id && <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 5, color: 'var(--accent)', background: 'var(--accent2)', fontFamily: 'var(--font-mono)' }}>↩ {e.issue_id.slice(0, 6)}</span>}
                    </Link>
                ))}
            </div>
        </div>
    );
}
