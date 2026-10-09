import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTicket } from './hooks';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { ink } from '../../lib/ink';
import type { TicketDetail } from '../../lib/types';
import { TICKET_STATUS, TICKET_PRIORITY } from './ticketMeta';
import { slaMetricPresentation } from './sla';
import { SMALL_PILL_CLASSES, deskCard, smallLabel, smallPill } from './supportStyles';
import { sectionTitle } from '../issues/issueStyles';

const asideStyle: CSSProperties = { width: 296, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg2)', overflowY: 'auto' };
const kv: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 };
const label: CSSProperties = { ...smallLabel, padding: '18px 18px 8px' };
const ellipsis: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

export function TicketContext({ ticketId, onFilterTag = () => {} }: { ticketId: string | undefined; onFilterTag?: (id: string, name: string) => void }) {
    const q = useTicket(ticketId ?? '');
    if (!ticketId) return <aside aria-label="Ticket details" style={asideStyle} />;
    return (
        <aside aria-label="Ticket details" style={asideStyle}>
            {/* While the ticket loads or fails the aside stays empty: the conversation pane (same useTicket) carries the message. */}
            {q.data && <TicketDetails t={q.data} onFilterTag={onFilterTag} />}
        </aside>
    );
}

function TicketDetails({ t, onFilterTag }: { t: TicketDetail; onFilterTag: (id: string, name: string) => void }) {
    const req = t.requester;
    const linked = t.linked_issues[0];
    return (
        <>
            <div style={{ padding: '18px 18px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {req && <Avatar {...avatarFor(req)} size={42} />}
                    <div style={{ minWidth: 0 }}>
                        <div style={{ ...sectionTitle(17), ...ellipsis }}>{req?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--fg2)', ...ellipsis }}>{req?.email}</div>
                    </div>
                </div>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                {req?.org && <div style={kv}><span style={{ color: 'var(--fg3)' }}>Organization</span><span style={{ fontWeight: 600 }}>{req.org}</span></div>}
                {req?.plan && <div style={kv}><span style={{ color: 'var(--fg3)' }}>Plan</span><span style={{ fontWeight: 600 }}>{req.plan}</span></div>}
                <div style={kv}><span style={{ color: 'var(--fg3)' }}>Assignee</span><span style={{ fontWeight: 600 }}>{t.assignee?.name ?? 'Unassigned'}</span></div>
                <div style={kv}><span style={{ color: 'var(--fg3)' }}>Priority</span><span style={{ fontWeight: 600 }}>{TICKET_PRIORITY[t.priority].label}</span></div>
            </div>
            {t.sla_metrics.length > 0 && (
                <div style={{ margin: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {t.sla_metrics.map((metric) => {
                        const pres = slaMetricPresentation(metric);
                        if (!pres) return null;
                        return (
                            <div key={metric.metric} data-testid="sla-card" style={{ ...deskCard, padding: '13px 15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: ink(pres.color) }}>{pres.title}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {pres.paused && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', color: 'var(--fg3)', background: 'var(--hover)' }}>⏸ Paused</span>}
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: ink(pres.color) }}>{pres.remaining}</span>
                                    </span>
                                </div>
                                <div style={{ marginTop: 9, height: 5, borderRadius: 'var(--radius-pill)', background: 'var(--border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.round(pres.pct * 100)}%`, background: pres.color, borderRadius: 'var(--radius-pill)' }} />
                                </div>
                                {metric.policy_name && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--fg2)' }}>{pres.label} target · {metric.policy_name}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
            {t.tags.length > 0 && (<>
                <div style={label}>Tags</div>
                <div style={{ padding: '0 18px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {t.tags.map((tag) => (
                        <button key={tag.id} type="button" onClick={() => onFilterTag(tag.id, tag.name)} className={SMALL_PILL_CLASSES} style={smallPill}>
                            {tag.name}
                        </button>
                    ))}
                </div>
            </>)}
            {linked && (<>
                <div style={label}>Linked engineering issue</div>
                <Link to={`/issues/${linked.id}`} style={{ display: 'block', margin: '0 18px', padding: '13px 14px', border: 'var(--line) solid var(--accent)', background: 'var(--accent2)', borderRadius: 'var(--radius-card)', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-ink)', fontWeight: 600 }}>{linked.identifier ?? linked.id.slice(0, 6)}</span><span style={{ marginLeft: 'auto', color: 'var(--accent-ink)', fontSize: 12 }}>↗</span></div>
                    <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--fg)', fontWeight: 500, lineHeight: 1.4 }}>{linked.title}</div>
                </Link>
            </>)}
            {t.requester_history.length > 0 && (<>
                <div style={label}>Recent from {req?.name}</div>
                <div style={{ padding: '0 12px 22px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {t.requester_history.map((h) => <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 'var(--radius-row)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: TICKET_STATUS[h.status].color, flexShrink: 0 }} /><span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.subject}</span></div>)}
                </div>
            </>)}
        </>
    );
}
