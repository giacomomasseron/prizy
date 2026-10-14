import { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { timeAgo } from '../../lib/timeAgo';
import type { AppNotification } from '../../lib/types';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '../notifications/hooks';
import { notificationMeta, notificationText, subjectPath, type NotificationCategory } from '../notifications/text';

const SHOWN = 5;

const KIND: Record<NotificationCategory, string> = { mention: 'Mention', assign: 'Assigned', comment: 'Comment', status: 'Status', other: 'Update' };

/** The notification's line, as the inbox writes it: the actor's name first where the inbox shows it. */
function lineFor(n: AppNotification): string {
    const { category } = notificationMeta(n.type);
    return n.actor && ['mention', 'comment', 'status'].includes(category) ? `${n.actor.name} ${notificationText(n.type)}` : notificationText(n.type);
}

/**
 * New for you (the Today v2 design): up to five unread notifications, newest first, each with ✓ Mark read; Mark all
 * read and Open Inbox →. Hidden when nothing is unread (or while the list loads or cannot load: the inbox has its own
 * page).
 */
export function NewForYouCard() {
    const unread = useNotifications('all', true);
    const count = useUnreadCount();
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();
    const headingId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);

    const items = (unread.data?.items ?? []).filter((n) => !n.read_at).slice(0, SHOWN);
    if (items.length === 0) return null;

    return (
        <section aria-labelledby={headingId} style={{ borderRadius: 22, background: 'var(--panel)', border: 'var(--line) solid var(--fg)', boxShadow: 'var(--pop-shadow)', padding: '16px 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '0 6px 8px' }}>
                <h2 id={headingId} ref={headingRef} tabIndex={-1} style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.025em' }}>New for you</h2>
                <span data-testid="new-for-you-count" style={{ fontSize: 13, fontWeight: 800, color: 'var(--on-hi)', background: 'var(--hi)', borderRadius: 'var(--radius-pill)', padding: '0 8px' }}>
                    {count.data?.count ?? items.length}
                </span>
                <button type="button" onClick={() => markAllRead.mutate()} className="text-fg3 hover:text-fg" style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
                    Mark all read
                </button>
            </div>
            <ul aria-label="New for you" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((n) => {
                    const meta = notificationMeta(n.type);
                    const avatar = n.actor ? avatarFor(n.actor) : null;
                    const path = n.subject?.path ?? subjectPath(n.subject_type, n.subject_id);
                    const line = lineFor(n);
                    return (
                        <li key={n.id} data-testid="new-for-you-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 6px', borderTop: 'var(--line) solid var(--border)' }}>
                            {avatar ? <Avatar initials={avatar.initials} color={avatar.color} size={28} title={n.actor?.name} /> : <span aria-hidden="true" style={{ width: 28, flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {path ? (
                                    <Link to={path} onClick={() => markRead.mutate(n.id)} className="text-fg hover:text-accent" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{line}</Link>
                                ) : (
                                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{line}</span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--fg3)', fontWeight: 600, flexWrap: 'wrap' }}>
                                    <span style={{ border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-pill)', padding: '0 9px', whiteSpace: 'nowrap', color: 'var(--fg2)' }}>
                                        <span aria-hidden="true">{meta.icon} </span>{KIND[meta.category]}
                                    </span>
                                    {n.subject?.ref && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>{n.subject.ref}</span>}
                                    <span style={{ marginLeft: 'auto' }}>{timeAgo(n.created_at)}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label={`Mark read: ${line}`}
                                title="Mark read"
                                // The row leaves once read, and this button held the focus: hand it to the heading.
                                onClick={() => { markRead.mutate(n.id); headingRef.current?.focus(); }}
                                className="bg-transparent text-fg3 hover:bg-hover hover:text-fg"
                                style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0, fontFamily: 'inherit' }}
                            >
                                ✓
                            </button>
                        </li>
                    );
                })}
            </ul>
            <Link to="/notifications" className="text-fg hover:text-accent" style={{ display: 'block', padding: '9px 6px 2px', borderTop: 'var(--line) solid var(--border)', fontSize: 13.5, fontWeight: 700 }}>
                Open Inbox →
            </Link>
        </section>
    );
}
