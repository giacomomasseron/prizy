import type { CSSProperties } from 'react';
import { useMarkAllRead, useMarkRead, useMarkUnread, useToggleSnooze, useToggleArchive } from './hooks';
import { lineParts } from './text';
import { KindChip } from './KindChip';
import { shortAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { QueryState, type QueryLike } from '../../components/ui/QueryState';
import { Avatar } from '../../components/ui/Avatar';
import { ROW_ACTIONS_CLASSES, ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from '../../components/ui/rowPrimary';
import type { AppNotification } from '../../lib/types';
import { HI_PILL_CLASSES, TOOL_PILL_CLASSES, toolPillStyle } from '../issues/issueStyles';
import { paneHeader, paneSub, paneTitle } from '../support/supportStyles';

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

/** Hover-revealed row action: a small round outlined button; its colours live in classes. */
const actionBtn: CSSProperties = {
    width: 26, height: 26, borderRadius: '50%', borderWidth: 'var(--line)', borderStyle: 'solid', padding: 0,
    cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
const ACTION_BTN_CLASSES = 'border-border2 bg-panel text-fg2 hover:border-fg hover:text-fg';

/** Selected row: white with a 3:1 ring, like a selected ticket on the desk. */
const selectedRow: CSSProperties = { background: 'var(--panel)', boxShadow: 'inset 0 0 0 1.5px var(--field)' };

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
 * Notifications page main list (Prizy Notifications.dc.html center pane): header
 * (filter label + count/unread subheading + "Unread only" toggle + "Mark all
 * read"), rows grouped by Today / Yesterday / Earlier this week. Presentational —
 * the parent page (Task 5) owns the `useNotifications` query and category/unreadOnly
 * state; this component only wires the per-row mutation hooks.
 * v2: a desk-style pane header, pill controls, and rows whose hover lives in classes.
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

    const pill: CSSProperties = { ...toolPillStyle, padding: '6px 12px', fontSize: 12.5 };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ ...paneHeader, justifyContent: 'space-between', padding: '10px 18px' }}>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ ...paneTitle, margin: 0 }}>{heading}</h1>
                    <div style={paneSub}>
                        {items.length} {items.length === 1 ? 'notification' : 'notifications'} · {unreadCount} unread
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" aria-pressed={unreadOnly} onClick={onToggleUnread} style={pill} className={unreadOnly ? HI_PILL_CLASSES : TOOL_PILL_CLASSES}>
                        {unreadOnly ? 'Showing unread' : 'Unread only'}
                    </button>
                    <button type="button" onClick={() => markAllRead.mutate()} style={pill} className={TOOL_PILL_CLASSES}>
                        <span aria-hidden="true">✓ </span>Mark all read
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <QueryState query={listState} what="notifications" frame={{ padding: '20px 18px' }}>
                    {items.length === 0 && (
                        <div data-testid="inbox-empty" style={{ margin: '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '90px 20px', textAlign: 'center', border: 'var(--line) dashed var(--border2)', borderRadius: 22 }}>
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
                            <div key={g.label}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 18px 8px' }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>{g.label}</span>
                                    <span data-testid={`day-count-${g.label}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg3)' }}>{g.rows.length}</span>
                                </div>
                                {g.rows.map((n) => {
                                    const unread = !n.read_at;
                                    const selected = selectedId === n.id;
                                    const [who, what] = lineParts(n);
                                    const avatar = n.actor ? avatarFor(n.actor) : null;

                                    return (
                                        // No inline background on unselected rows: it would beat hover:bg-hover.
                                        <div
                                            key={n.id}
                                            data-testid={`notif-row-${n.id}`}
                                            onClick={() => selectRow(n)}
                                            className={`${selected ? 'group' : 'group bg-transparent hover:bg-hover'} ${ROW_FOCUS_CLASSES}`}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 18px',
                                                borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                                ...(selected ? selectedRow : {}),
                                            }}
                                        >
                                            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 9, flexShrink: 0, background: unread ? 'var(--accent)' : 'transparent' }} />
                                            {avatar && <Avatar initials={avatar.initials} color={avatar.color} size={24} title={n.actor?.name} />}

                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {/* The row's primary control (V2-G3b): its click bubbles to the row. */}
                                                <button type="button" aria-current={selected ? 'true' : undefined} className={ROW_PRIMARY_CLASSES} style={{ ...rowPrimary, display: 'block', width: '100%', fontSize: 13.5, color: 'var(--fg)', lineHeight: 1.45 }}>
                                                    {/* The space sits outside the hidden span so the name reads "Unread: …"; visually it collapses at the line start. */}
                                                    {unread && <><span className="sr-only">Unread:</span>{' '}</>}
                                                    {who ? (
                                                        <>
                                                            <span style={{ fontWeight: 700 }}>{who}</span> <span>{what}</span>
                                                        </>
                                                    ) : (
                                                        what
                                                    )}
                                                </button>
                                                {n.body && (
                                                    <div style={{ fontSize: 12.5, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {n.body}
                                                    </div>
                                                )}
                                                {/* Its kind on a chip, what it is about, and how long ago. */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                                    <KindChip type={n.type} />
                                                    {n.subject?.ref && (
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)' }}>
                                                            {n.subject.ref}
                                                        </span>
                                                    )}
                                                    <span data-testid="notif-time" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg3)', marginLeft: 'auto' }}>{shortAgo(n.created_at)}</span>
                                                </div>
                                            </div>

                                            {/* Shown on row hover, while one of them has keyboard focus, and always on a touch screen. */}
                                            <div className={ROW_ACTIONS_CLASSES} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                {unread ? (
                                                    <button
                                                        type="button"
                                                        aria-label="Mark read"
                                                        style={actionBtn}
                                                        className={ACTION_BTN_CLASSES}
                                                        onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                                                    >
                                                        ●
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        aria-label="Mark unread"
                                                        style={actionBtn}
                                                        className={ACTION_BTN_CLASSES}
                                                        onClick={(e) => { e.stopPropagation(); markUnread.mutate(n.id); }}
                                                    >
                                                        ○
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    aria-label="Snooze"
                                                    style={actionBtn}
                                                    className={ACTION_BTN_CLASSES}
                                                    onClick={(e) => { e.stopPropagation(); toggleSnooze.mutate(n.id); }}
                                                >
                                                    ☾
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label="Archive"
                                                    style={actionBtn}
                                                    className={ACTION_BTN_CLASSES}
                                                    onClick={(e) => { e.stopPropagation(); toggleArchive.mutate(n.id); }}
                                                >
                                                    ⌫
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                </QueryState>
            </div>
        </div>
    );
}
