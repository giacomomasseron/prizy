import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useNotificationCounts, useSetSubscription, useSubscriptions, useUnreadCount, type NotificationCounts } from './hooks';
import { useTeams } from '../teams/hooks';
import { NAV_ROW_HOVER, hiBadge, tagBadge } from '../../components/sidebarStyles';
import { sideRow, sideSection, sideTitle } from '../support/supportStyles';

const FILTERS = [
    { key: 'all', label: 'All', icon: '▤' },
    { key: 'mention', label: 'Mentions', icon: '@' },
    { key: 'assign', label: 'Assigned', icon: '→' },
    { key: 'support', label: 'From Support', icon: '▲' },
    { key: 'snoozed', label: 'Snoozed', icon: '☾' },
    { key: 'archived', label: 'Archived', icon: '⌫' },
] as const satisfies readonly { key: keyof NotificationCounts; label: string; icon: string }[];

/** Snoozed and Archived count everything in them; the others count what is unread. */
const COUNTS_ALL_ROWS = new Set<string>(['snoozed', 'archived']);

/** A filter's count while it is not the open one: quiet, in the text colour (readable in both themes). */
const quietCount: CSSProperties = { ...hiBadge, color: 'var(--fg)', background: 'var(--border)' };

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

    const counts = useNotificationCounts().data;
    // All is the bell's number until the filter counts arrive (and on a server that does not have them).
    const countFor = (key: keyof NotificationCounts): number => counts?.[key] ?? (key === 'all' ? unread.data?.count ?? 0 : 0);
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
            <div data-testid="rail-title" style={{ ...sideTitle, padding: '16px 16px 10px calc(16px + var(--nav-inset, 0px))' }}>Inbox</div>

            <nav aria-label="Inbox filters" style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {FILTERS.map((f) => {
                    const active = category === f.key && !settingsActive;
                    const count = countFor(f.key);
                    return (
                        <button key={f.key} type="button" aria-pressed={active} onClick={() => onCategory(f.key)} style={{ ...sideRow(active), fontSize: 14.5, padding: '7px 12px' }} className={active ? '' : NAV_ROW_HOVER}>
                            {/* Decorative: the label names the filter. Ink on the open filter, muted on the rest. */}
                            <span aria-hidden="true" style={{ width: 18, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontWeight: 700, color: active ? 'var(--fg)' : 'var(--fg3)' }}>{f.icon}</span>
                            <span style={{ flex: 1, textAlign: 'left' }}>{f.label}</span>
                            {count > 0 && (
                                <>
                                    <span data-testid={`filter-count-${f.key}`} aria-hidden="true" style={active ? hiBadge : quietCount}>{count > 99 ? '99+' : count}</span>
                                    <span className="sr-only">, {count}{COUNTS_ALL_ROWS.has(f.key) ? '' : ' unread'}</span>
                                </>
                            )}
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
                <Link to="/issues" style={sideRow(false)} className={NAV_ROW_HOVER}>
                    ← Back to Issues
                </Link>
            </div>
        </>
    );
}
