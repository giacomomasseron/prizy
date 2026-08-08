import { useState } from 'react';
import { NotificationSidebar } from './NotificationSidebar';
import { NotificationList } from './NotificationList';
import { NotificationDetail } from './NotificationDetail';
import { NotificationSettings } from './NotificationSettings';
import { useNotifications } from './hooks';

type View = 'list' | 'settings';

/**
 * Notifications page (Prizy Notifications.dc.html): a 3-pane inbox — left
 * rail (filters + subscriptions + settings entry), a center list, and a right
 * detail pane — or the settings view in place of list+detail. Owns the
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
    const selected = items.find((n) => n.id === selectedId) ?? null;

    function handleCategory(c: string) {
        setCategory(c);
        setView('list');
        setSelectedId(null);
    }

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            <aside
                style={{
                    width: 232, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', overflowY: 'auto',
                }}
            >
                <NotificationSidebar
                    category={category}
                    onCategory={handleCategory}
                    settingsActive={view === 'settings'}
                    onOpenSettings={() => setView('settings')}
                />
            </aside>

            {view === 'settings' ? (
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <NotificationSettings onBack={() => setView('list')} />
                </div>
            ) : (
                <>
                    <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
                        <NotificationList
                            items={items}
                            isLoading={list.isLoading}
                            category={category}
                            unreadOnly={unreadOnly}
                            onToggleUnread={() => setUnreadOnly((v) => !v)}
                            selectedId={selectedId}
                            onSelect={(n) => setSelectedId(n.id)}
                        />
                    </div>
                    <div style={{ width: 360, flexShrink: 0, background: 'var(--bg2)', overflow: 'hidden' }}>
                        <NotificationDetail notification={selected} />
                    </div>
                </>
            )}
        </div>
    );
}
