import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMarkRead, useMarkUnread } from './hooks';
import { notificationMeta, notificationText, reasonFor } from './text';
import { timeAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { sectionTitle } from '../issues/issueStyles';
import { deskCard, smallLabel } from '../support/supportStyles';
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
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid var(--border)', fontSize: 13,
};

/** "Open {ref}": a link drawn as the ink Button (its colours live in classes so hover works). */
const openLink: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 'var(--radius-pill)',
    borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 13, fontWeight: 700, lineHeight: 1, textDecoration: 'none',
};

/**
 * Notifications page right detail pane (Prizy Notifications.dc.html <aside>):
 * for the selected notification — kind + time, title, target link, an actor
 * card + body, meta rows (Trigger/Channel/Received), an "Open {ref}" link, a
 * Mark read/unread toggle, and a "Why you got this" reason block. Per spec,
 * the mockup's per-notification Unsubscribe is OMITTED — subscriptions are
 * team/project-level and live in the rail (Task 1). Presentational — the
 * parent page (Task 5) owns selection state. v2: display title, sentence-case
 * kind tag, v2 cards and the ink "Open" link.
 */
export function NotificationDetail({ notification }: { notification: AppNotification | null }) {
    const markRead = useMarkRead();
    const markUnread = useMarkUnread();

    if (!notification) {
        return (
            <div
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
                    padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--fg3)',
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflowY: 'auto', padding: '20px 22px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-pill)', color: 'var(--accent)', background: 'var(--accent2)' }}>
                    {kind}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{timeAgo(notification.created_at)}</span>
            </div>

            <h2 style={{ ...sectionTitle(20), lineHeight: 1.25, margin: '0 0 14px' }}>{title}</h2>

            {notification.subject && (
                <Link
                    to={notification.subject.path}
                    className="border-border bg-panel hover:border-fg"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '9px 12px',
                        borderRadius: 'var(--radius-row)', borderWidth: 'var(--line)', borderStyle: 'solid', textDecoration: 'none',
                    }}
                >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent)', flexShrink: 0 }}>
                        {notification.subject.ref}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--fg2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notification.subject.title}
                    </span>
                </Link>
            )}

            {notification.actor ? (
                <div style={{ ...deskCard, display: 'flex', gap: 10, padding: 14, marginBottom: 18 }}>
                    <Avatar initials={avatar?.initials} color={avatar?.color} size={28} title={notification.actor.name} />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)', marginBottom: 3 }}>{notification.actor.name}</div>
                        {notification.body && <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.55 }}>{notification.body}</div>}
                    </div>
                </div>
            ) : (
                notification.body && (
                    <div style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.55, marginBottom: 18 }}>{notification.body}</div>
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {notification.subject && (
                    <Link to={notification.subject.path} style={openLink} className="border-transparent bg-fg text-bg hover:bg-accent">
                        Open {notification.subject.ref}
                    </Link>
                )}
                {isRead ? (
                    <Button variant="secondary" size="sm" onClick={() => markUnread.mutate(notification.id)}>
                        Mark unread
                    </Button>
                ) : (
                    <Button variant="secondary" size="sm" onClick={() => markRead.mutate(notification.id)}>
                        Mark read
                    </Button>
                )}
            </div>

            <div style={{ padding: 14, borderRadius: 'var(--radius-card)', border: 'var(--line) dashed var(--border2)' }}>
                <div style={{ ...smallLabel, marginBottom: 4 }}>Why you got this</div>
                <div style={{ fontSize: 13, color: 'var(--fg2)' }}>{reasonFor(notification.type)}</div>
            </div>
        </div>
    );
}
