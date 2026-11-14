import type { CSSProperties, ReactNode } from 'react';
import { useMarkAllRead, useMarkRead, useMarkUnread, useToggleSnooze, useToggleArchive } from './hooks';
import { lineParts } from './text';
import { KindChip } from './KindChip';
import { shortAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { QueryState, type QueryLike } from '../../components/ui/QueryState';
import { Avatar } from '../../components/ui/Avatar';
import { ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from '../../components/ui/rowPrimary';
import type { AppNotification } from '../../lib/types';
import { HI_PILL_CLASSES, toolPillStyle } from '../issues/issueStyles';
import { InboxHeader } from './InboxHeader';

const CATEGORY_LABEL: Record<string, string> = {
    all: 'Inbox',
    mention: 'Mentions',
    assign: 'Assigned',
    support: 'From Support',
    snoozed: 'Snoozed',
    archived: 'Archived',
};

/** The empty card's second line where the design's own ("…live in their own filters") would point a view at itself. */
const EMPTY_OWN: Record<string, string> = {
    snoozed: 'No snoozed notifications',
    archived: 'No archived notifications',
};

/** A row action: a small round button with no edge, always there (the design does not hide them until hover). */
const actionBtn: CSSProperties = {
    width: 30, height: 30, borderRadius: '50%', border: 'none', padding: 0,
    cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
const ACTION_BTN_CLASSES = 'bg-transparent text-fg3 hover:bg-hover hover:text-fg';

/** A notification: a card. Its colours are classes, so the open one can swap the quiet edge for the ink one. */
const card: CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 14px 14px 12px', cursor: 'pointer',
    borderRadius: 18, borderWidth: 'var(--line)', borderStyle: 'solid', transition: 'box-shadow .12s, border-color .12s',
};
/** Where the avatar goes on a notice nobody sent (the system's own): a gear on a dark circle. */
const gear: CSSProperties = { width: 36, height: 36, borderRadius: '50%', background: 'var(--fg2)', color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 };
/** The header's two controls: roomy pills. */
const headerPill: CSSProperties = { ...toolPillStyle, padding: '9px 18px', fontSize: 14, fontWeight: 700 };

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function groupByDay(items: AppNotification[]): { label: string; rows: AppNotification[] }[] {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const today: AppNotification[] = [];
    const yest: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    for (const n of items) {
        const d = new Date(n.created_at);
        if (isSameDay(d, now)) today.push(n);
        else if (isSameDay(d, yesterday)) yest.push(n);
        else earlier.push(n);
    }

    return [
        { label: 'Today', rows: today },
        { label: 'Yesterday', rows: yest },
        { label: 'Earlier this week', rows: earlier },
    ].filter((g) => g.rows.length > 0);
}

/**
 * The Inbox's list view (Prizy Notifications.dc.html): the page header (the filter's name, how many and how many
 * unread, "Unread only" and "Mark all read"), and under it the notifications as cards grouped by Today / Yesterday /
 * Earlier this week, with whatever is given as `aside` (the open notification) beside them. Presentational: the page
 * owns the `useNotifications` query and the category / unread-only / selection state; this wires the row actions.
 */
export function NotificationList({
    items,
    isLoading,
    query,
    category,
    unreadOnly,
    onToggleUnread,
    selectedId,
    onSelect,
    aside,
}: {
    items: AppNotification[];
    isLoading: boolean;
    /** The inbox query itself (V2-G3c): when given, a failed load shows the retryable alert; `isLoading` alone keeps the loading line. */
    query?: QueryLike;
    category: string;
    unreadOnly: boolean;
    onToggleUnread: () => void;
    selectedId: string | null;
    onSelect: (n: AppNotification) => void;
    /** Shown beside the list, under the header: the open notification's detail. */
    aside?: ReactNode;
}) {
    const markAllRead = useMarkAllRead();
    const markRead = useMarkRead();
    const markUnread = useMarkUnread();
    const toggleSnooze = useToggleSnooze();
    const toggleArchive = useToggleArchive();

    const unreadCount = items.filter((n) => !n.read_at).length;
    const heading = CATEGORY_LABEL[category] ?? 'Inbox';
    const groups = groupByDay(items);

    function selectRow(n: AppNotification) {
        onSelect(n);
        if (!unreadOnly && !n.read_at) markRead.mutate(n.id);
    }

    const listState: QueryLike = query ?? { isLoading, isError: false, refetch: () => undefined };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0 }}>
            <InboxHeader title={heading} sub={`${items.length} ${items.length === 1 ? 'notification' : 'notifications'} · ${unreadCount} unread`}>
                <button type="button" aria-pressed={unreadOnly} onClick={onToggleUnread} style={headerPill} className={unreadOnly ? HI_PILL_CLASSES : 'border-border2 bg-transparent text-fg2 hover:border-fg hover:text-fg'}>
                    {unreadOnly ? 'Showing unread' : 'Unread only'}
                </button>
                <button type="button" onClick={() => markAllRead.mutate()} style={headerPill} className="border-fg bg-panel text-fg hover:bg-hi hover:text-on-hi">
                    <span aria-hidden="true">✓ </span>Mark all read
                </button>
            </InboxHeader>

            <div data-testid="inbox-columns" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 24, padding: '0 32px 28px', overflowX: 'auto' }}>
                <div style={{ flex: '1 1 480px', minWidth: 380, overflowY: 'auto', padding: '2px 8px 8px 2px' }}>
                    <QueryState query={listState} what="notifications" frame={{ padding: '20px 4px' }}>
                        {items.length === 0 && (
                            <div data-testid="inbox-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '90px 20px', textAlign: 'center', border: 'var(--line) dashed var(--border2)', borderRadius: 22 }}>
                                <div aria-hidden="true" style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--hi)', color: 'var(--on-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>✓</div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>{unreadOnly ? 'Nothing unread' : 'All clear'}</div>
                                <div style={{ fontSize: 14.5, color: 'var(--fg3)', maxWidth: 340, lineHeight: 1.6 }}>
                                    {unreadOnly
                                        ? 'Everything in this view has been read. Turn off the unread filter to see it again.'
                                        : EMPTY_OWN[category] ?? 'This view is empty. Snoozed and archived notifications live in their own filters.'}
                                </div>
                            </div>
                        )}

                        {groups.map((g) => (
                            <div key={g.label} style={{ marginBottom: 22 }}>
                                {/* Stays at the top of the list while its day scrolls under it. */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 4px 10px', position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg)' }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>{g.label}</span>
                                    <span data-testid={`day-count-${g.label}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg3)' }}>{g.rows.length}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {g.rows.map((n) => {
                                        const unread = !n.read_at;
                                        const selected = selectedId === n.id;
                                        const [who, what] = lineParts(n);
                                        const avatar = n.actor ? avatarFor(n.actor) : null;
                                        // Both actions toggle: on a snoozed or archived row they undo it, and say so.
                                        const snoozed = !!n.snoozed_until && new Date(n.snoozed_until).getTime() > Date.now();
                                        const archived = !!n.archived_at;

                                        return (
                                            <div
                                                key={n.id}
                                                data-testid={`notif-row-${n.id}`}
                                                onClick={() => selectRow(n)}
                                                className={`bg-panel ${selected ? 'border-fg' : 'border-border hover:border-border2'} ${ROW_FOCUS_CLASSES}`}
                                                style={selected ? { ...card, boxShadow: 'var(--pop-shadow)' } : card}
                                            >
                                                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 14, flexShrink: 0, background: unread ? 'var(--accent)' : 'transparent' }} />
                                                {avatar
                                                    ? <Avatar initials={avatar.initials} color={avatar.color} size={36} title={n.actor?.name} />
                                                    : <span data-testid="notif-gear" aria-hidden="true" style={gear}>⚙</span>}

                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                                                        {/* The row's primary control (V2-G3b): its click bubbles to the row. Heavy while unread. */}
                                                        <button
                                                            type="button"
                                                            aria-current={selected ? 'true' : undefined}
                                                            className={ROW_PRIMARY_CLASSES}
                                                            style={{ ...rowPrimary, flex: '1 1 auto', minWidth: 0, fontSize: 15.5, fontWeight: unread ? 800 : 600, color: unread ? 'var(--fg)' : 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                        >
                                                            {/* The space sits outside the hidden span so the name reads "Unread: …"; visually it collapses at the line start. */}
                                                            {unread && <><span className="sr-only">Unread:</span>{' '}</>}
                                                            {who ? <><span>{who}</span> <span>{what}</span></> : what}
                                                        </button>
                                                        <span data-testid="notif-time" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg3)', flexShrink: 0, marginLeft: 'auto' }}>{shortAgo(n.created_at)}</span>
                                                    </div>
                                                    {n.body && (
                                                        <div style={{ fontSize: 14, color: 'var(--fg2)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {n.body}
                                                        </div>
                                                    )}
                                                    {/* Its kind on a chip, and what it is about. */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                                                        <KindChip type={n.type} />
                                                        {n.subject?.ref && (
                                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>
                                                                {n.subject.ref}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignSelf: 'flex-start' }}>
                                                    {unread ? (
                                                        <button type="button" aria-label="Mark read" title="Mark read" style={{ ...actionBtn, fontSize: 12 }} className={ACTION_BTN_CLASSES} onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}>●</button>
                                                    ) : (
                                                        <button type="button" aria-label="Mark unread" title="Mark unread" style={{ ...actionBtn, fontSize: 12 }} className={ACTION_BTN_CLASSES} onClick={(e) => { e.stopPropagation(); markUnread.mutate(n.id); }}>○</button>
                                                    )}
                                                    <button type="button" aria-label={snoozed ? 'Unsnooze' : 'Snooze'} title={snoozed ? 'Unsnooze' : 'Snooze 1 day'} style={actionBtn} className={ACTION_BTN_CLASSES} onClick={(e) => { e.stopPropagation(); toggleSnooze.mutate(n.id); }}>☾</button>
                                                    <button type="button" aria-label={archived ? 'Unarchive' : 'Archive'} title={archived ? 'Unarchive' : 'Archive'} style={actionBtn} className={ACTION_BTN_CLASSES} onClick={(e) => { e.stopPropagation(); toggleArchive.mutate(n.id); }}>⌫</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </QueryState>
                </div>
                {aside}
            </div>
        </div>
    );
}
