import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppNotification } from '../../lib/types';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from './hooks';
import { notificationText, subjectPath } from './text';

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const unread = useUnreadCount();
    const list = useNotifications(false, open);
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();
    const count = unread.data?.count ?? 0;

    function openNotification(n: AppNotification) {
        markRead.mutate(n.id);
        setOpen(false);
        const path = subjectPath(n.subject_type, n.subject_id);
        if (path) navigate(path);
    }

    return (
        <div className="relative">
            <button type="button" aria-label="Notifications" onClick={() => setOpen((o) => !o)} className="relative text-fg2 hover:text-fg">
                🔔
                {count > 0 && (
                    <span className="absolute -right-2 -top-1 rounded-full bg-red px-1 text-xs text-white">{count > 9 ? '9+' : count}</span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-2 w-80 rounded border border-border bg-panel shadow">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                        <span className="font-semibold">Notifications</span>
                        <button type="button" onClick={() => markAllRead.mutate()} className="text-xs text-accent hover:underline">Mark all read</button>
                    </div>
                    <ul className="max-h-80 divide-y overflow-auto">
                        {list.data?.items.map((n) => (
                            <li key={n.id}>
                                <button type="button" onClick={() => openNotification(n)} className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-hover">
                                    {!n.read_at && <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />}
                                    <span className={n.read_at ? 'text-fg2' : ''}>{notificationText(n.type)}<span className="ml-1 text-xs text-fg3">{n.created_at.slice(0, 10)}</span></span>
                                </button>
                            </li>
                        ))}
                        {list.isLoading && <li className="px-3 py-2 text-sm text-fg3">Loading…</li>}
                        {!list.isLoading && (list.data?.items.length ?? 0) === 0 && <li className="px-3 py-2 text-sm text-fg3">No notifications</li>}
                    </ul>
                    <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-border px-3 py-2 text-center text-sm text-accent hover:underline">See all →</Link>
                </div>
            )}
        </div>
    );
}
