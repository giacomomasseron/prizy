import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { QueryState, type QueryLike } from '../../components/ui/QueryState';
import { avatarFor } from '../../lib/avatarFor';
import { ink } from '../../lib/ink';
import { Menu, type MenuItem } from '../../components/ui/Menu';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from '../../components/ui/rowPrimary';
import { TOOL_PILL_CLASSES, toolPillStyle } from '../issues/issueStyles';
import { TICKET_STATUS, TICKET_PRIORITY } from './ticketMeta';
import { primarySlaMetric, slaMetricPresentation } from './sla';
import { accentTag, paneHeader, paneSub, paneTitle, statusTag } from './supportStyles';
import type { TicketListItem, TicketPriority } from '../../lib/types';
import { issueRef } from '../issues/issueMeta';

const SORTS = [
    { key: 'updated_at', label: 'Recently updated' },
    { key: 'created_at', label: 'Newest' },
    { key: 'priority', label: 'Priority' },
    { key: 'sla_due', label: 'SLA due' },
];

function PriorityIcon({ priority }: { priority: TicketPriority }) {
    if (priority === 'urgent') {
        return <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--amber)', color: 'var(--on-hi)', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} role="img" aria-label="Priority: Urgent">!</span>;
    }
    const fill = TICKET_PRIORITY[priority].bars;
    return <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: 11, flexShrink: 0 }} role="img" aria-label={`Priority: ${TICKET_PRIORITY[priority].label}`}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 3, borderRadius: 1, height: 4 + i * 3, background: i < fill ? 'var(--fg2)' : 'var(--border2)' }} />)}</span>;
}

export function TicketList({ tickets, selectedId, onSelect, sort, onSortChange, hasMore, onLoadMore, loadingMore, query }: {
    tickets: TicketListItem[];
    selectedId: string | undefined;
    onSelect: (id: string) => void;
    sort: string;
    onSortChange: (sort: string) => void;
    hasMore: boolean;
    onLoadMore: () => void;
    loadingMore: boolean;
    /** The tickets query, when the list should show its loading and failed states. */
    query?: QueryLike;
}) {
    const activeSort = SORTS.find((s) => s.key === sort) ?? SORTS[0];
    const sortItems: MenuItem[] = SORTS.map((s) => ({ key: s.key, label: s.label, onActivate: () => onSortChange(s.key) }));
    return (
        <section style={{ width: 342, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            <header style={{ ...paneHeader, gap: 8, padding: '10px 14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={paneTitle}>Tickets</div>
                    {(!query || query.data !== undefined) && <div style={paneSub}>{tickets.length} tickets</div>}
                </div>
                <Menu
                    placement="bottom-start"
                    trigger={
                        <button
                            type="button"
                            aria-label="Sort tickets"
                            className={TOOL_PILL_CLASSES}
                            style={{ ...toolPillStyle, padding: '6px 12px', fontSize: 12.5 }}
                        >
                            {activeSort.label}
                            <span aria-hidden="true" style={{ color: 'var(--fg3)' }}>▾</span>
                        </button>
                    }
                    items={sortItems}
                />
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <QueryState query={query ?? { isLoading: false, isError: false, refetch: () => undefined }} what="tickets" frame={{ padding: 16 }}>
                    {tickets.map((t) => {
                        const st = TICKET_STATUS[t.status];
                        const active = t.id === selectedId;
                        const linked = t.linked_issues[0];
                        return (
                            // No inline background on unselected rows: it would beat hover:bg-hover. The subject is the row's
                            // primary control (V2-G3b): Tab reaches it, Enter/Space click it, and the click bubbles to the row.
                            <div key={t.id} data-testid="ticket-row" onClick={() => onSelect(t.id)}
                                style={{ display: 'flex', gap: 10, padding: '12px 14px 13px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', ...(active ? { background: 'var(--panel)', boxShadow: 'inset 0 0 0 1.5px var(--field)' } : {}) }}
                                className={`${active ? '' : 'bg-transparent hover:bg-hover'} ${ROW_FOCUS_CLASSES}`}>
                                <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 'var(--radius-pill)', background: st.color, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)' }}>#{t.id.slice(0, 8)}</span>
                                        <span style={statusTag(st.color)}>{st.label}</span>
                                        {linked && <span style={accentTag}>↩ {issueRef(linked)}</span>}
                                        {(() => {
                                            const primary = primarySlaMetric(t.sla_metrics);
                                            const pres = primary ? slaMetricPresentation(primary) : null;
                                            return (
                                                <span style={{ marginLeft: 'auto', fontSize: 11, color: pres ? ink(pres.color) : 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                                                    {pres ? pres.remaining : '—'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <button type="button" aria-current={active ? 'true' : undefined} className={ROW_PRIMARY_CLASSES} style={{ ...rowPrimary, display: 'block', width: '100%' }}>
                                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.subject}</span>
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        {t.requester && <Avatar {...avatarFor(t.requester)} size={20} />}
                                        <span style={{ fontSize: 12, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{t.requester?.name}{t.requester?.org ? ` · ${t.requester.org}` : ''}</span>
                                        <PriorityIcon priority={t.priority} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {tickets.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg3)', fontSize: 13.5 }}>No tickets in this view.</div>}
                    {hasMore && (
                        <div style={{ padding: 14, textAlign: 'center' }}>
                            <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={loadingMore}>
                                {loadingMore ? 'Loading…' : 'Load more'}
                            </Button>
                        </div>
                    )}
                </QueryState>
            </div>
        </section>
    );
}
