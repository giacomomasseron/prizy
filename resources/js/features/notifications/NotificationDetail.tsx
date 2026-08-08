import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMarkRead, useMarkUnread } from './hooks';
import { notificationMeta, notificationText, reasonFor } from './text';
import { timeAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import type { AppNotification } from '../../lib/types';

const KIND_LABEL: Record<string, string> = {
    issue_mentioned: 'Mention',
    issue_assigned: 'Assigned to you',
    issue_commented: 'New comment',
    issue_status_changed: 'Status change',
    issue_unblocked: 'Unblocked',
};

function kindLabel(type: string): string {
    return KIND_LABEL[type] ?? 'Notification';
}

const metaRow: CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '7px 0',
    borderBottom: '1px solid var(--border)', fontSize: 12,
};

const openBtn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'var(--accent2)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600,
    textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
};

const actionBtn: CSSProperties = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'transparent', color: 'var(--fg2)', fontSize: 12.5, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
};

/**
 * Notifications page right detail pane (Prizy Notifications.dc.html <aside>):
 * for the selected notification — kind + time, title, target link, an actor
 * card + body, meta rows (Trigger/Channel/Received), an "Open {ref}" link, a
 * Mark read/unread toggle, and a "Why you got this" reason block. Per spec,
 * the mockup's per-notification Unsubscribe is OMITTED — subscriptions are
 * team/project-level and live in the rail (Task 1). Presentational — the
 * parent page (Task 5) owns selection state.
 */
export function NotificationDetail({ notification }: { notification: AppNotification | null }) {
    const markRead = useMarkRead();
    const markUnread = useMarkUnread();

    if (!notification) {
        return (
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                    padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--fg3)',
                }}
            >
                Select a notification to see details
            </div>
        );
    }

    const meta = notificationMeta(notification.type);
    const kind = kindLabel(notification.type);
    const showActorName = !!notification.actor && (['mention', 'comment', 'status'] as string[]).includes(meta.category);
    const title = showActorName
        ? `${notification.actor!.name} ${notificationText(notification.type)}`
        : notificationText(notification.type);
    const avatar = notification.actor ? avatarFor(notification.actor) : null;
    const isRead = !!notification.read_at;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflowY: 'auto', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span
                    style={{
                        fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
                        color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 20, padding: '2px 8px',
                    }}
                >
                    {kind}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{timeAgo(notification.created_at)}</span>
            </div>

            <h2 style={{ margin: '0 0 12px', fontSize: 15.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4 }}>{title}</h2>

            {notification.subject && (
                <Link
                    to={notification.subject.path}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 10px',
                        borderRadius: 8, border: '1px solid var(--border)', textDecoration: 'none',
                    }}
                >
                    <span
                        style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', background: 'var(--accent2)',
                            borderRadius: 4, padding: '1px 6px', flexShrink: 0,
                        }}
                    >
                        {notification.subject.ref}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notification.subject.title}
                    </span>
                </Link>
            )}

            {notification.actor ? (
                <div
                    style={{
                        display: 'flex', gap: 10, marginBottom: 18, padding: 12, borderRadius: 8,
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}
                >
                    <Avatar initials={avatar?.initials} color={avatar?.color} size={28} title={notification.actor.name} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>{notification.actor.name}</div>
                        {notification.body && <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>{notification.body}</div>}
                    </div>
                </div>
            ) : (
                notification.body && (
                    <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5, marginBottom: 18 }}>{notification.body}</div>
                )
            )}

            <div style={{ marginBottom: 18 }}>
                <div style={metaRow}>
                    <span style={{ color: 'var(--fg3)' }}>Trigger</span>
                    <span style={{ color: 'var(--fg)' }}>{kind}</span>
                </div>
                <div style={metaRow}>
                    <span style={{ color: 'var(--fg3)' }}>Channel</span>
                    <span style={{ color: 'var(--fg)' }}>In-app</span>
                </div>
                <div style={{ ...metaRow, borderBottom: 'none' }}>
                    <span style={{ color: 'var(--fg3)' }}>Received</span>
                    <span style={{ color: 'var(--fg)' }}>{timeAgo(notification.created_at)}</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {notification.subject && (
                    <Link to={notification.subject.path} style={openBtn}>
                        Open {notification.subject.ref}
                    </Link>
                )}
                {isRead ? (
                    <button type="button" style={actionBtn} onClick={() => markUnread.mutate(notification.id)}>
                        Mark unread
                    </button>
                ) : (
                    <button type="button" style={actionBtn} onClick={() => markRead.mutate(notification.id)}>
                        Mark read
                    </button>
                )}
            </div>

            <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--border2)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 4 }}>
                    Why you got this
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg2)' }}>{reasonFor(notification.type)}</div>
            </div>
        </div>
    );
}
