import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { TICKET_STATUS, TICKET_PRIORITY } from './ticketMeta';
import { primarySlaMetric, slaMetricPresentation } from './sla';
import type { TicketListItem, TicketPriority } from '../../lib/types';

const SORTS = [
    { key: 'updated_at', label: 'Recently updated' },
    { key: 'created_at', label: 'Newest' },
    { key: 'priority', label: 'Priority' },
    { key: 'sla_due', label: 'SLA due' },
];

function tint(color: string) { return `color-mix(in srgb, ${color} 15%, transparent)`; }

function PriorityIcon({ priority }: { priority: TicketPriority }) {
    if (priority === 'urgent') {
        return <span style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--amber)', color: '#161616', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-label="urgent">!</span>;
    }
    const fill = TICKET_PRIORITY[priority].bars;
    return <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: 11, flexShrink: 0 }} aria-label={priority}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 3, borderRadius: 1, height: 4 + i * 3, background: i < fill ? 'var(--fg2)' : 'var(--border2)' }} />)}</span>;
}

export function TicketList({ tickets, selectedId, onSelect, sort, onSortChange, hasMore, onLoadMore, loadingMore }: {
    tickets: TicketListItem[];
    selectedId: string | undefined;
    onSelect: (id: string) => void;
    sort: string;
    onSortChange: (sort: string) => void;
    hasMore: boolean;
    onLoadMore: () => void;
    loadingMore: boolean;
}) {
    const activeSort = SORTS.find((s) => s.key === sort) ?? SORTS[0];
    const sortItems: MenuItem[] = SORTS.map((s) => ({ key: s.key, label: s.label, onActivate: () => onSortChange(s.key) }));
    return (
        <section style={{ width: 342, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            <header style={{ height: 52, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Tickets</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>{tickets.length} tickets</div>
                </div>
                <Menu
                    placement="bottom-start"
                    trigger={
                        <button
                            type="button"
                            aria-label="Sort tickets"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--panel)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            {activeSort.label}
                            <span aria-hidden="true" style={{ color: 'var(--fg3)' }}>▾</span>
                        </button>
                    }
                    items={sortItems}
                />
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {tickets.map((t) => {
                    const st = TICKET_STATUS[t.status];
                    const active = t.id === selectedId;
                    const linked = t.linked_issues[0];
                    return (
                        <div key={t.id} data-testid="ticket-row" onClick={() => onSelect(t.id)}
                            style={{ display: 'flex', gap: 10, padding: '12px 13px 13px 11px', cursor: 'pointer', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${active ? st.color : 'transparent'}`, background: active ? 'var(--hover)' : 'transparent' }}
                            className={active ? '' : 'hover:bg-hover'}>
                            <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 3, background: st.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg3)' }}>#{t.id.slice(0, 8)}</span>
                                    <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', padding: '1px 6px', borderRadius: 5, color: st.color, background: tint(st.color) }}>{st.label}</span>
                                    {linked && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 5, color: 'var(--accent)', background: 'var(--accent2)', fontFamily: 'var(--font-mono)' }}>↩ {linked.identifier ?? linked.id.slice(0, 6)}</span>}
                                    {(() => {
                                        const primary = primarySlaMetric(t.sla_metrics);
                                        const pres = primary ? slaMetricPresentation(primary) : null;
                                        return (
                                            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: pres ? pres.color : 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                                                {pres ? pres.remaining : '—'}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.subject}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    {t.requester && <Avatar {...avatarFor(t.requester)} size={20} />}
                                    <span style={{ fontSize: 11.5, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{t.requester?.name}{t.requester?.org ? ` · ${t.requester.org}` : ''}</span>
                                    <PriorityIcon priority={t.priority} />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {tickets.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>No tickets in this view.</div>}
                {hasMore && (
                    <div style={{ padding: 14, textAlign: 'center' }}>
                        <button
                            type="button"
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--panel)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: loadingMore ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loadingMore ? 0.6 : 1 }}
                        >
                            {loadingMore ? 'Loading…' : 'Load more'}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
