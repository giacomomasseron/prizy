import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMarkRead, useMarkUnread } from './hooks';
import { lineParts, reasonFor } from './text';
import { KindChip } from './KindChip';
import { timeAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import type { AppNotification } from '../../lib/types';

const KIND_LABEL: Record<string, string> = {
    issue_mentioned: 'Mention',
    project_mentioned: 'Mention',
    issue_assigned: 'Assigned to you',
    issue_commented: 'New comment',
    issue_status_changed: 'Status change',
    issue_unblocked: 'Unblocked',
};

function kindLabel(type: string): string {
    return KIND_LABEL[type] ?? 'Notification';
}

const metaRow: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 0', borderBottom: 'var(--line) solid var(--border)' };
const metaKey: CSSProperties = { width: 80, flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--fg3)' };
const metaValue: CSSProperties = { fontSize: 14, color: 'var(--fg)' };

/** "Open {ref}": a link drawn as the full-width ink button (its colours live in classes so hover works). */
const openLink: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px', borderRadius: 'var(--radius-pill)',
    fontSize: 15, fontWeight: 700, textDecoration: 'none',
};
/** Mark read / Mark unread: the outlined pill under it. */
const quietPill: CSSProperties = {
    flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
    fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
};
const QUIET_PILL_CLASSES = 'border-border2 bg-transparent text-fg2 hover:border-fg hover:text-fg';

/**
 * The open notification (Prizy Notifications.dc.html right <aside>): an ink card with the hard shadow holding its
 * kind and when it came, the title, what it is about, who sent it and what they wrote, the Trigger / Channel /
 * Received rows, "Open {ref}", Mark read or unread, and why you got it. Nothing at all while no notification is open.
 * Left out: the mockup's per-notification Unsubscribe (subscriptions are per team and live in the rail) and the
 * sender's team (a person can be in several). Presentational: the page owns which one is open.
 */
export function NotificationDetail({ notification }: { notification: AppNotification | null }) {
    const markRead = useMarkRead();
    const markUnread = useMarkUnread();

    if (!notification) return null;

    const kind = kindLabel(notification.type);
    // The same line the list shows, who first: "Leon Kraus assigned an issue to you".
    const [who, what] = lineParts(notification);
    const title = who ? `${who} ${what}` : what;
    const avatar = notification.actor ? avatarFor(notification.actor) : null;
    const isRead = !!notification.read_at;

    const ago = timeAgo(notification.created_at);

    return (
        <div data-testid="notif-detail" style={{ border: 'var(--line) solid var(--fg)', borderRadius: 22, background: 'var(--panel)', boxShadow: '5px 5px 0 var(--fg)', padding: '22px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18, marginRight: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <KindChip type={notification.type} />
                <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--fg3)' }}>{ago}</span>
            </div>

            <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.025em', textWrap: 'pretty', color: 'var(--fg)' }}>{title}</h2>
                {notification.subject && (
                    <Link to={notification.subject.path} className="text-fg2 hover:text-fg" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, marginTop: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', maxWidth: '100%' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--accent-ink)', flexShrink: 0 }}>{notification.subject.ref}</span>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notification.subject.title}</span>
                    </Link>
                )}
            </div>

            {(notification.actor || notification.body) && (
                <div style={{ borderRadius: 16, background: 'var(--bg)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {notification.actor && (
                        <div data-testid="notif-detail-actor" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar initials={avatar?.initials} color={avatar?.color} size={30} title={notification.actor.name} />
                            <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>{notification.actor.name}</span>
                        </div>
                    )}
                    {notification.body && <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--fg2)', textWrap: 'pretty' }}>{notification.body}</div>}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={metaRow}><span style={metaKey}>Trigger</span><span style={metaValue}>{kind}</span></div>
                <div style={metaRow}><span style={metaKey}>Channel</span><span style={metaValue}>In-app</span></div>
                <div style={metaRow}><span style={metaKey}>Received</span><span style={metaValue}>{ago}</span></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notification.subject && (
                    <Link to={notification.subject.path} style={openLink} className="bg-fg text-bg hover:bg-accent">
                        Open {notification.subject.ref}
                    </Link>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                    {isRead ? (
                        <button type="button" style={quietPill} className={QUIET_PILL_CLASSES} onClick={() => markUnread.mutate(notification.id)}>Mark unread</button>
                    ) : (
                        <button type="button" style={quietPill} className={QUIET_PILL_CLASSES} onClick={() => markRead.mutate(notification.id)}>Mark read</button>
                    )}
                </div>
            </div>

            <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg3)', marginBottom: 6 }}>Why you got this</div>
                <div style={{ fontSize: 14, color: 'var(--fg2)', lineHeight: 1.6 }}>{reasonFor(notification.type)}</div>
            </div>
        </div>
    );
}
