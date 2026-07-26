import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTicket } from './hooks';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { TICKET_STATUS, TICKET_PRIORITY } from './ticketMeta';

const asideStyle: CSSProperties = { width: 296, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto' };
const kv: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 12.2 };
const label: CSSProperties = { padding: '16px 18px 6px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' };

export function TicketContext({ ticketId }: { ticketId: string | undefined }) {
    const q = useTicket(ticketId ?? '');
    const t = q.data;
    if (!ticketId || !t) return <aside style={asideStyle} />;
    const req = t.requester;
    const linked = t.linked_issues[0];
    return (
        <aside style={asideStyle}>
            <div style={{ padding: '18px 18px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {req && <Avatar {...avatarFor(req)} size={42} />}
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req?.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req?.email}</div>
                    </div>
                </div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {req?.org && <div style={kv}><span style={{ color: 'var(--fg3)' }}>Organization</span><span style={{ fontWeight: 500 }}>{req.org}</span></div>}
                {req?.plan && <div style={kv}><span style={{ color: 'var(--fg3)' }}>Plan</span><span style={{ fontWeight: 600 }}>{req.plan}</span></div>}
                <div style={kv}><span style={{ color: 'var(--fg3)' }}>Assignee</span><span style={{ fontWeight: 500 }}>{t.assignee?.name ?? 'Unassigned'}</span></div>
                <div style={kv}><span style={{ color: 'var(--fg3)' }}>Priority</span><span style={{ fontWeight: 500 }}>{TICKET_PRIORITY[t.priority].label}</span></div>
            </div>
            <div style={{ margin: '0 18px', padding: '13px 14px', border: '1px solid var(--border2)', background: 'var(--panel)', borderRadius: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: t.sla.breached ? 'var(--red)' : 'var(--sup)' }}>{t.sla.breached ? 'SLA breached' : 'SLA'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg2)' }}>{t.sla.policy_name ?? '—'}</span>
                </div>
            </div>
            {t.tags.length > 0 && (<>
                <div style={label}>Tags</div>
                <div style={{ padding: '0 18px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {t.tags.map((tag) => <span key={tag.name} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'var(--panel)', border: '1px solid var(--border2)', color: 'var(--fg2)' }}>{tag.name}</span>)}
                </div>
            </>)}
            {linked && (<>
                <div style={label}>Linked engineering issue</div>
                <Link to={`/issues/${linked.id}`} style={{ display: 'block', margin: '0 18px', padding: '12px 13px', border: '1px solid var(--accent)', background: 'var(--accent2)', borderRadius: 11, textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{linked.identifier ?? linked.id.slice(0, 6)}</span><span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 12 }}>↗</span></div>
                    <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--fg)', fontWeight: 500, lineHeight: 1.4 }}>{linked.title}</div>
                </Link>
            </>)}
            {t.requester_history.length > 0 && (<>
                <div style={label}>Recent from {req?.name}</div>
                <div style={{ padding: '0 12px 22px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {t.requester_history.map((h) => <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 7 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: TICKET_STATUS[h.status].color, flexShrink: 0 }} /><span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.subject}</span></div>)}
                </div>
            </>)}
        </aside>
    );
}
