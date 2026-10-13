import type { CSSProperties } from 'react';
import { useMarkAllRead, useMarkRead, useMarkUnread, useToggleSnooze, useToggleArchive } from './hooks';
import { notificationMeta, notificationText } from './text';
import { timeAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { QueryState, type QueryLike } from '../../components/ui/QueryState';
import { Avatar } from '../../components/ui/Avatar';
import { ROW_ACTIONS_CLASSES, ROW_FOCUS_CLASSES, ROW_PRIMARY_CLASSES, rowPrimary } from '../../components/ui/rowPrimary';
import type { AppNotification } from '../../lib/types';
import { HI_PILL_CLASSES, TOOL_PILL_CLASSES, toolPillStyle } from '../issues/issueStyles';
import { sectionLabel } from '../../components/sidebarStyles';
import { paneHeader, paneSub, paneTitle } from '../support/supportStyles';

const CATEGORY_LABEL: Record<string, string> = {
    all: 'Inbox',
    mention: 'Mentions',
    assign: 'Assigned',
    support: 'From Support',
    snoozed: 'Snoozed',
    archived: 'Archived',
};

const EMPTY_COPY: Record<string, string> = {
    all: "You're all caught up",
    mention: "No mentions — you're all caught up",
    assign: 'Nothing assigned to you right now',
    support: 'No messages from Support',
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
                        {items.length} notifications · {unreadCount} unread
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" aria-pressed={unreadOnly} onClick={onToggleUnread} style={pill} className={unreadOnly ? HI_PILL_CLASSES : TOOL_PILL_CLASSES}>
                        Unread only
                    </button>
                    <button type="button" onClick={() => markAllRead.mutate()} style={pill} className={TOOL_PILL_CLASSES}>
                        <span aria-hidden="true">✓ </span>Mark all read
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <QueryState query={listState} what="notifications" frame={{ padding: '20px 18px' }}>
                    {items.length === 0 && (
                        <div style={{ padding: '48px 18px', textAlign: 'center', fontSize: 14, color: 'var(--fg3)' }}>
                            {EMPTY_COPY[category] ?? "You're all caught up"}
                        </div>
                    )}

                    {groups.map((g) => (
                            <div key={g.label}>
                                <div style={{ ...sectionLabel, padding: '14px 18px 6px' }}>{g.label}</div>
                                {g.rows.map((n) => {
                                    const meta = notificationMeta(n.type);
                                    const unread = !n.read_at;
                                    const selected = selectedId === n.id;
                                    const showActorName = !!n.actor && (['mention', 'comment', 'status'] as string[]).includes(meta.category);
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
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border2)', background: 'var(--panel)',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11.5, color: 'var(--fg2)', flexShrink: 0,
                                                }}
                                            >
                                                {meta.icon}
                                            </span>
                                            {avatar && <Avatar initials={avatar.initials} color={avatar.color} size={24} title={n.actor?.name} />}

                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {/* The row's primary control (V2-G3b): its click bubbles to the row. */}
                                                <button type="button" aria-current={selected ? 'true' : undefined} className={ROW_PRIMARY_CLASSES} style={{ ...rowPrimary, display: 'block', width: '100%', fontSize: 13.5, color: 'var(--fg)', lineHeight: 1.45 }}>
                                                    {/* The space sits outside the hidden span so the name reads "Unread: …"; visually it collapses at the line start. */}
                                                    {unread && <><span className="sr-only">Unread:</span>{' '}</>}
                                                    {showActorName ? (
                                                        <>
                                                            <span style={{ fontWeight: 700 }}>{n.actor!.name}</span> <span>{notificationText(n.type)}</span>
                                                        </>
                                                    ) : (
                                                        notificationText(n.type)
                                                    )}
                                                </button>
                                                {n.body && (
                                                    <div style={{ fontSize: 12.5, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {n.body}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {n.subject?.ref && (
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                                                            {n.subject.ref}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{timeAgo(n.created_at)}</span>
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
