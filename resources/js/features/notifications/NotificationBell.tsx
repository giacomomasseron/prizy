import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadCount, useMarkAllRead, useMarkRead } from './hooks';
import { notificationMeta, notificationText, subjectPath } from './text';
import { timeAgo } from '../../lib/timeAgo';
import { avatarFor } from '../../lib/avatarFor';
import { Avatar } from '../../components/ui/Avatar';
import type { AppNotification } from '../../lib/types';

/**
 * Toolbar notifications bell (Prizy.dc.html header): a bordered button with an
 * unread badge that opens a dropdown of recent notifications + an "Open inbox →"
 * link. Wired to the existing endpoints; rows lightly render the enriched actor
 * avatar / body excerpt / subject ref when the API provides them (all optional —
 * the full inbox redesign lands in a later sub-project).
 */
export function NotificationBell() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [hover, setHover] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unread = useUnreadCount();
    const list = useNotifications('all', false, open); // only fetch the list while the dropdown is open
    const markAll = useMarkAllRead();
    const markRead = useMarkRead();

    const count = unread.data?.count ?? 0;
    const badge = count > 99 ? '99+' : String(count);
    const items = (list.data?.items ?? []).slice(0, 6);

    useEffect(() => {
        if (!open) return;
        function onDown(e: PointerEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    function openItem(n: AppNotification) {
        markRead.mutate(n.id);
        const path = n.subject?.path ?? subjectPath(n.subject_type, n.subject_id);
        setOpen(false);
        if (path) navigate(path);
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                aria-label="Notifications"
                title="Notifications"
                onClick={() => setOpen((o) => !o)}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    position: 'relative', width: 30, height: 30, borderRadius: 8,
                    border: '1px solid',
                    borderColor: open ? 'var(--accent)' : hover ? 'var(--border2)' : 'var(--border)',
                    background: open ? 'var(--accent2)' : 'transparent', color: 'var(--fg2)',
                    cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0,
                }}
            >
                <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>◔</span>
                {count > 0 && (
                    <span
                        data-testid="notif-bell-badge"
                        style={{
                            position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px',
                            borderRadius: 20, background: 'var(--accent)', color: '#fff', fontSize: 9.5, fontWeight: 700,
                            fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--bg)',
                        }}
                    >
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Notifications"
                    style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 366, zIndex: 30,
                        background: 'var(--panel)', border: '1px solid var(--border2)', borderRadius: 13,
                        boxShadow: '0 18px 44px rgba(0,0,0,.42)', overflow: 'hidden',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Notifications</span>
                        {count > 0 && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 20, padding: '1px 7px', fontFamily: 'var(--font-mono)' }}>{badge}</span>
                        )}
                        <button
                            type="button"
                            onClick={() => markAll.mutate()}
                            disabled={count === 0}
                            style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--fg3)', fontSize: 11.5, cursor: count > 0 ? 'pointer' : 'default', padding: '2px 4px', fontFamily: 'inherit', opacity: count > 0 ? 1 : 0.5 }}
                        >
                            Mark all read
                        </button>
                    </div>

                    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                        {list.isLoading && <div style={{ padding: '14px 13px', fontSize: 12.5, color: 'var(--fg3)' }}>Loading…</div>}
                        {!list.isLoading && items.length === 0 && (
                            <div style={{ padding: '20px 13px', fontSize: 12.5, color: 'var(--fg3)', textAlign: 'center' }}>You're all caught up</div>
                        )}
                        {items.map((n) => {
                            const avatar = n.actor ? avatarFor(n.actor) : null;
                            const meta = notificationMeta(n.type);
                            const showActorName = n.actor && ['mention', 'comment', 'status'].includes(meta.category);
                            return (
                                <div
                                    key={n.id}
                                    onClick={() => openItem(n)}
                                    className="hover:bg-hover"
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 13px 10px 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                >
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 7, flexShrink: 0, background: n.read_at ? 'transparent' : 'var(--accent)' }} />
                                    {avatar && <Avatar initials={avatar.initials} color={avatar.color} size={20} title={n.actor?.name} />}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <div style={{ fontSize: 12.3, color: 'var(--fg)', lineHeight: 1.45 }}>
                                            {showActorName && <span style={{ fontWeight: 600 }}>{n.actor!.name} </span>}
                                            {notificationText(n.type)}
                                        </div>
                                        {n.body && (
                                            <div style={{ fontSize: 11.5, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {n.body}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 10.5, color: 'var(--fg3)' }}>{timeAgo(n.created_at)}</span>
                                            {n.subject?.ref && (
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 4, padding: '1px 5px' }}>
                                                    {n.subject.ref}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Link
                        to="/notifications"
                        onClick={() => setOpen(false)}
                        className="hover:bg-hover"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg2)', textDecoration: 'none' }}
                    >
                        Open inbox →
                    </Link>
                </div>
            )}
        </div>
    );
}
