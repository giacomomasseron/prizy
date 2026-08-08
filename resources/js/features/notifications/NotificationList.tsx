import type { CSSProperties } from 'react';
import { useMarkAllRead, useMarkRead, useMarkUnread, useToggleSnooze, useToggleArchive } from './hooks';
import { notificationMeta, notificationText } from './text';
import { timeAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import type { AppNotification } from '../../lib/types';

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

const toggleBtn = (active: boolean): CSSProperties => ({
    padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border2)', fontFamily: 'inherit',
    fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
    background: active ? 'var(--accent2)' : 'transparent', color: active ? 'var(--accent)' : 'var(--fg2)',
});

const groupLabel: CSSProperties = {
    padding: '12px 18px 6px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em',
    textTransform: 'uppercase', color: 'var(--fg3)',
};

const actionBtn: CSSProperties = {
    width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--panel)',
    color: 'var(--fg2)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

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
 */
export function NotificationList({
    items,
    isLoading,
    category,
    unreadOnly,
    onToggleUnread,
    selectedId,
    onSelect,
}: {
    items: AppNotification[];
    isLoading: boolean;
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
        if (!n.read_at) markRead.mutate(n.id);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: 'var(--fg)' }}>{heading}</h1>
                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--fg3)' }}>
                        {items.length} notifications · {unreadCount} unread
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" aria-pressed={unreadOnly} onClick={onToggleUnread} style={toggleBtn(unreadOnly)}>
                        Unread only
                    </button>
                    <button type="button" onClick={() => markAllRead.mutate()} style={toggleBtn(false)}>
                        <span aria-hidden="true">✓ </span>Mark all read
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {isLoading && <div style={{ padding: '20px 18px', fontSize: 12.5, color: 'var(--fg3)' }}>Loading…</div>}

                {!isLoading && items.length === 0 && (
                    <div style={{ padding: '48px 18px', textAlign: 'center', fontSize: 13, color: 'var(--fg3)' }}>
                        {EMPTY_COPY[category] ?? "You're all caught up"}
                    </div>
                )}

                {!isLoading &&
                    groups.map((g) => (
                        <div key={g.label}>
                            <div style={groupLabel}>{g.label}</div>
                            {g.rows.map((n) => {
                                const meta = notificationMeta(n.type);
                                const unread = !n.read_at;
                                const selected = selectedId === n.id;
                                const showActorName = !!n.actor && (['mention', 'comment', 'status'] as string[]).includes(meta.category);
                                const avatar = n.actor ? avatarFor(n.actor) : null;

                                return (
                                    <div
                                        key={n.id}
                                        data-testid={`notif-row-${n.id}`}
                                        onClick={() => selectRow(n)}
                                        className={`group ${selected ? '' : 'hover:bg-hover'}`}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 18px',
                                            borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                            background: selected ? 'var(--accent2)' : 'transparent',
                                        }}
                                    >
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 8, flexShrink: 0, background: unread ? 'var(--accent)' : 'transparent' }} />
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border2)',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, color: 'var(--fg2)', flexShrink: 0, marginTop: 1,
                                            }}
                                        >
                                            {meta.icon}
                                        </span>
                                        {avatar && <Avatar initials={avatar.initials} color={avatar.color} size={22} title={n.actor?.name} />}

                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4 }}>
                                                {showActorName ? (
                                                    <>
                                                        <span style={{ fontWeight: 600 }}>{n.actor!.name}</span> <span>{notificationText(n.type)}</span>
                                                    </>
                                                ) : (
                                                    notificationText(n.type)
                                                )}
                                            </div>
                                            {n.body && (
                                                <div style={{ fontSize: 12, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {n.body}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {n.subject?.ref && (
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 4, padding: '1px 5px' }}>
                                                        {n.subject.ref}
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 11, color: 'var(--fg3)' }}>{timeAgo(n.created_at)}</span>
                                            </div>
                                        </div>

                                        <div className="opacity-0 group-hover:opacity-100" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 1 }}>
                                            {unread ? (
                                                <button
                                                    type="button"
                                                    aria-label="Mark read"
                                                    style={actionBtn}
                                                    onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                                                >
                                                    ●
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    aria-label="Mark unread"
                                                    style={actionBtn}
                                                    onClick={(e) => { e.stopPropagation(); markUnread.mutate(n.id); }}
                                                >
                                                    ○
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                aria-label="Snooze"
                                                style={actionBtn}
                                                onClick={(e) => { e.stopPropagation(); toggleSnooze.mutate(n.id); }}
                                            >
                                                ☾
                                            </button>
                                            <button
                                                type="button"
                                                aria-label="Archive"
                                                style={actionBtn}
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
            </div>
        </div>
    );
}
