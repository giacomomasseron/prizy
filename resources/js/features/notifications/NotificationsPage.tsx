import { useState } from 'react';
import { NotificationSidebar } from './NotificationSidebar';
import { NotificationList } from './NotificationList';
import { NotificationDetail } from './NotificationDetail';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from './hooks';
import { sideFrame } from '../support/supportStyles';

type View = 'list' | 'settings';

/**
 * Notifications page (Prizy Notifications.dc.html): the left rail (filters +
 * subscriptions + settings entry) and, under one big header, the list of
 * cards with the open notification beside it — or the settings view. Owns the
 * view/category/unreadOnly/selectedId state and the single `useNotifications`
 * query the list and detail panes share, so the detail always reflects the
 * same data the list is showing.
 */
export default function NotificationsPage() {
    const [view, setView] = useState<View>('list');
    const [category, setCategory] = useState('all');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const list = useNotifications(category, unreadOnly);
    const items = list.data?.items ?? [];
    // The first notification is open on arrival, on a new filter, and when the open one leaves the list (the design).
    // Opening it this way does not mark it read: only choosing a row does.
    const selected = items.find((n) => n.id === selectedId) ?? items[0] ?? null;

    function handleCategory(c: string) {
        setCategory(c);
        setView('list');
        setSelectedId(null);
    }

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            {/* The desk sidebar frame, kept at the inbox's 232px (subscription rows need the room). */}
            <aside aria-label="Inbox" style={{ ...sideFrame, width: 232 }}>
                <NotificationSidebar
                    category={category}
                    onCategory={handleCategory}
                    settingsActive={view === 'settings'}
                    onOpenSettings={() => setView('settings')}
                />
            </aside>

            {/* Not a <main>: the app layout already is one. */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {view === 'settings' ? (
                    <NotificationSettings onBack={() => setView('list')} />
                ) : (
                    <NotificationList
                        items={items}
                        isLoading={list.isLoading}
                        query={list}
                        category={category}
                        unreadOnly={unreadOnly}
                        onToggleUnread={() => setUnreadOnly((v) => !v)}
                        selectedId={selected?.id ?? null}
                        onSelect={(n) => setSelectedId(n.id)}
                        // The open notification, beside the list. No column at all while there is nothing to open.
                        aside={selected && (
                            <aside aria-label="Notification" style={{ flex: '0 1 380px', minWidth: 300, overflowY: 'auto', padding: '2px 6px 8px 2px' }}>
                                <NotificationDetail notification={selected} />
                            </aside>
                        )}
                    />
                )}
            </div>
        </div>
    );
}
