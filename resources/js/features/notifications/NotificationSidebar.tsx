import { Link } from 'react-router-dom';
import { useSetSubscription, useSubscriptions, useUnreadCount } from './hooks';
import { useTeams } from '../teams/hooks';
import { NAV_ROW_HOVER, hiBadge, tagBadge } from '../../components/sidebarStyles';
import { sideRow, sideSection, sideTitle } from '../support/supportStyles';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'mention', label: 'Mentions' },
    { key: 'assign', label: 'Assigned' },
    { key: 'support', label: 'From Support' },
    { key: 'snoozed', label: 'Snoozed' },
    { key: 'archived', label: 'Archived' },
] as const;

const LEVELS = ['all', 'mentions', 'off'] as const;
type SubLevel = (typeof LEVELS)[number];
const LEVEL_LABEL: Record<SubLevel, string> = { all: 'All', mentions: '@ only', off: 'Off' };

function nextLevel(level: string): SubLevel {
    const idx = LEVELS.indexOf(level as SubLevel);
    return LEVELS[(idx + 1) % LEVELS.length];
}

/**
 * Notifications page left rail (Prizy Notifications.dc.html left <aside>): the
 * "Inbox" header + total unread badge, category filters, per-team subscription
 * level pills, and a footer ("Notification settings" + back-to-issues link).
 * Purely presentational — the parent page owns `category`/`settingsActive` state.
 * v2: the desk sidebar's look (display title, nav rows whose hover lives in classes).
 */
export function NotificationSidebar({
    category,
    onCategory,
    settingsActive,
    onOpenSettings,
}: {
    category: string;
    onCategory: (c: string) => void;
    settingsActive: boolean;
    onOpenSettings: () => void;
}) {
    const unread = useUnreadCount();
    const teams = useTeams({ mine: true });
    const subscriptions = useSubscriptions();
    const setSubscription = useSetSubscription();

    const unreadCount = unread.data?.count ?? 0;
    const myTeams = teams.data?.items ?? [];
    const subRows = subscriptions.data?.subscriptions ?? [];

    function levelFor(teamId: string): SubLevel {
        const row = subRows.find((s) => s.scope_type === 'team' && s.scope_id === teamId);
        return (row?.level as SubLevel) ?? 'all';
    }

    function cycle(teamId: string) {
        const next = nextLevel(levelFor(teamId));
        setSubscription.mutate({ scope_type: 'team', scope_id: teamId, level: next });
    }

    return (
        <>
            {/* Not a heading: the list pane owns the "Inbox" heading. */}
            {/* The left pad clears the floating "Expand sidebar" button when the main sidebar is hidden. */}
            <div style={{ ...sideTitle, display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 10px calc(16px + var(--nav-inset, 0px))' }}>
                Inbox
                {unreadCount > 0 && (
                    // The title's display font and tracking would otherwise reach the badge.
                    <span data-testid="rail-unread-badge" style={{ ...hiBadge, fontFamily: 'var(--font-sans)', letterSpacing: 'normal' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>

            <nav aria-label="Inbox filters" style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {FILTERS.map((f) => {
                    const active = category === f.key && !settingsActive;
                    return (
                        <button key={f.key} type="button" aria-pressed={active} onClick={() => onCategory(f.key)} style={sideRow(active)} className={active ? '' : NAV_ROW_HOVER}>
                            {f.label}
                        </button>
                    );
                })}
            </nav>

            <div style={sideSection}>Subscriptions</div>
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {myTeams.map((t) => (
                    <button key={t.id} type="button" onClick={() => cycle(t.id)} style={sideRow(false)} className={NAV_ROW_HOVER}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                        <span style={tagBadge}>{LEVEL_LABEL[levelFor(t.id)]}</span>
                    </button>
                ))}
                {myTeams.length === 0 && <div style={{ padding: '4px 10px', fontSize: 12.5, color: 'var(--fg3)' }}>No teams yet.</div>}
            </div>

            <div style={{ marginTop: 'auto', padding: 8, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button type="button" aria-pressed={settingsActive} onClick={onOpenSettings} style={sideRow(settingsActive)} className={settingsActive ? '' : NAV_ROW_HOVER}>
                    Notification settings
                </button>
                <Link to="/" style={sideRow(false)} className={NAV_ROW_HOVER}>
                    ← Back to Issues
                </Link>
            </div>
        </>
    );
}
