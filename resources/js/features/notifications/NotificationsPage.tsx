import { Link } from 'react-router-dom';
import { useMarkAllRead, useMarkRead, useNotifications } from './hooks';
import { notificationText, subjectPath } from './text';

export default function NotificationsPage() {
    const list = useNotifications();
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();

    return (
        <div className="mx-auto max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Notifications</h1>
                <button type="button" onClick={() => markAllRead.mutate()} className="text-sm text-indigo-600 hover:underline">Mark all read</button>
            </div>

            {list.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border bg-white">
                {list.data?.items.map((n) => {
                    const path = subjectPath(n.subject_type, n.subject_id);
                    return (
                        <li key={n.id} className="flex items-center justify-between px-4 py-3">
                            <span className="flex items-center gap-2 text-sm">
                                {!n.read_at && <span className="inline-block h-2 w-2 rounded-full bg-indigo-600" />}
                                {path ? <Link to={path} className={n.read_at ? 'text-gray-500 hover:underline' : 'hover:underline'}>{notificationText(n.type)}</Link> : <span className={n.read_at ? 'text-gray-500' : ''}>{notificationText(n.type)}</span>}
                                <span className="text-xs text-gray-400">{n.created_at.slice(0, 10)}</span>
                            </span>
                            {!n.read_at && <button type="button" onClick={() => markRead.mutate(n.id)} className="text-xs text-gray-500 hover:underline">Mark read</button>}
                        </li>
                    );
                })}
                {(list.data?.items.length ?? 0) === 0 && !list.isLoading && <li className="px-4 py-3 text-sm text-gray-400">No notifications</li>}
            </ul>
        </div>
    );
}
