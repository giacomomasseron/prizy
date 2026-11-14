import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { shortAgo } from '../../lib/timeAgo';
import type { AppNotification } from '../../lib/types';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '../notifications/hooks';
import { notificationMeta, notificationText, subjectPath, type NotificationCategory } from '../notifications/text';

const SHOWN = 5;

const KIND: Record<NotificationCategory, string> = { mention: 'Mention', assign: 'Assigned', comment: 'Comment', status: 'Status', other: 'Update' };
/** The kind chip's colour (the design colours it by kind): ink tones, readable on the panel in both themes. */
const KIND_INK: Record<NotificationCategory, string> = { mention: 'var(--accent-ink)', assign: 'var(--blue-ink)', comment: 'var(--fg2)', status: 'var(--fg2)', other: 'var(--fg2)' };

/** The notification's line, with the name of who did it first: "Maya Chen mentioned you", "Leon Kraus assigned an issue to you". */
function lineFor(n: AppNotification): string {
    const { category } = notificationMeta(n.type);
    if (!n.actor) return notificationText(n.type);
    if (n.type === 'issue_assigned') return `${n.actor.name} assigned an issue to you`;
    return ['mention', 'comment', 'status'].includes(category) ? `${n.actor.name} ${notificationText(n.type)}` : notificationText(n.type);
}

/** Where the avatar goes on a notice nobody sent (the system's own): a gear on a dark circle. */
const GEAR: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', background: 'var(--fg2)', color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 };

/**
 * New for you (the Today design): up to five unread notifications, newest first, each with who did it, its kind
 * on a chip coloured by kind, its reference and how long ago, and ✓ Mark read; Mark all
 * read and Open Inbox →. Hidden when nothing is unread (or while the list loads or cannot load: the inbox has its own
 * page) — unless it was emptied here: then it stays and says so, so the focus it holds keeps its place.
 */
export function NewForYouCard() {
    const unread = useNotifications('all', true);
    const count = useUnreadCount();
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();
    const headingId = useId();
    const headingRef = useRef<HTMLHeadingElement>(null);

    // Read from here: an emptied card stays (saying so) instead of vanishing with the focus inside it.
    const [readHere, setReadHere] = useState(false);
    const read = (mark: () => void) => {
        setReadHere(true);
        mark();
        headingRef.current?.focus();
    };

    const items = (unread.data?.items ?? []).filter((n) => !n.read_at).slice(0, SHOWN);
    if (items.length === 0 && !readHere) return null;

    return (
        <section aria-labelledby={headingId} style={{ borderRadius: 22, background: 'var(--panel)', border: 'var(--line) solid var(--fg)', boxShadow: 'var(--pop-shadow)', padding: '16px 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '0 6px 8px' }}>
                <h2 id={headingId} ref={headingRef} tabIndex={-1} style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-.025em' }}>New for you</h2>
                {items.length > 0 && (
                    <>
                        <span data-testid="new-for-you-count" style={{ fontSize: 13, fontWeight: 800, color: 'var(--on-hi)', background: 'var(--hi)', borderRadius: 'var(--radius-pill)', padding: '0 8px' }}>
                            {count.data?.count ?? items.length}
                        </span>
                        <button type="button" onClick={() => read(() => markAllRead.mutate())} className="text-fg3 hover:text-fg" style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
                            Mark all read
                        </button>
                    </>
                )}
            </div>
            {items.length === 0 ? (
                <p style={{ margin: 0, padding: '9px 6px', borderTop: 'var(--line) solid var(--border)', fontSize: 14, color: 'var(--fg3)' }}>{"You’re all caught up."}</p>
            ) : (
                <ul aria-label="New for you" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {items.map((n) => {
                        const meta = notificationMeta(n.type);
                        const avatar = n.actor ? avatarFor(n.actor) : null;
                        const path = n.subject?.path ?? subjectPath(n.subject_type, n.subject_id);
                        const line = lineFor(n);
                        return (
                            <li key={n.id} data-testid="new-for-you-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 6px', borderTop: 'var(--line) solid var(--border)' }}>
                                {avatar ? <Avatar initials={avatar.initials} color={avatar.color} size={28} title={n.actor?.name} /> : <span aria-hidden="true" style={GEAR}>⚙</span>}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {path ? (
                                        <Link to={path} onClick={() => markRead.mutate(n.id)} className="text-fg hover:text-accent" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{line}</Link>
                                    ) : (
                                        <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{line}</span>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--fg3)', fontWeight: 600, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: KIND_INK[meta.category], borderWidth: 'var(--line)', borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: 'var(--radius-pill)', padding: '0 9px', whiteSpace: 'nowrap' }}>
                                            <span aria-hidden="true">{meta.icon} </span>{KIND[meta.category]}
                                        </span>
                                        {n.subject?.ref && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>{n.subject.ref}</span>}
                                        <span data-testid="new-for-you-time" style={{ marginLeft: 'auto' }}>{shortAgo(n.created_at)}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Mark read: ${line}`}
                                    title="Mark read"
                                    // The row leaves once read, and this button held the focus: hand it to the heading.
                                    onClick={() => read(() => markRead.mutate(n.id))}
                                    className="bg-transparent text-fg3 hover:bg-hover hover:text-fg"
                                    style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0, fontFamily: 'inherit' }}
                                >
                                    ✓
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <Link to="/notifications" className="text-fg hover:text-accent" style={{ display: 'block', padding: '9px 6px 2px', borderTop: 'var(--line) solid var(--border)', fontSize: 13.5, fontWeight: 700 }}>
                Open Inbox →
            </Link>
        </section>
    );
}
