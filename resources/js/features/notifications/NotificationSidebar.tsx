import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useSetSubscription, useSubscriptions, useUnreadCount } from './hooks';
import { useTeams } from '../teams/hooks';

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

const filterRow = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', width: '100%', gap: 9, padding: '6px 9px', borderRadius: 7,
    border: 'none', fontFamily: 'inherit', fontSize: 12.8, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
    background: active ? 'var(--accent2)' : 'transparent', color: active ? 'var(--accent)' : 'var(--fg2)',
});

const footerBtn = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '6px 9px', borderRadius: 7,
    border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
    background: active ? 'var(--accent2)' : 'transparent', color: active ? 'var(--accent)' : 'var(--fg2)',
    textDecoration: 'none',
});

const sectionLabel: CSSProperties = { padding: '16px 18px 6px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' };

/**
 * Notifications page left rail (Prizy Notifications.dc.html left <aside>): the
 * "Inbox" header + total unread badge, category filters, per-team subscription
 * level pills, and a footer ("Notification settings" + back-to-issues link).
 * Purely presentational — the parent page owns `category`/`settingsActive` state.
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 10px' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>Inbox</span>
                {unreadCount > 0 && (
                    <span data-testid="rail-unread-badge" style={{ fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 20, padding: '1px 7px' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>

            <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => onCategory(f.key)}
                        style={filterRow(category === f.key && !settingsActive)}
                        className={category === f.key && !settingsActive ? '' : 'hover:bg-hover'}
                    >
                        {f.label}
                    </button>
                ))}
            </nav>

            <div style={sectionLabel}>Subscriptions</div>
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {myTeams.map((t) => {
                    const level = levelFor(t.id);
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => cycle(t.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 12.8, fontWeight: 500, color: 'var(--fg2)', cursor: 'pointer', textAlign: 'left' }}
                            className="hover:bg-hover"
                        >
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 20, padding: '1px 7px' }}>{LEVEL_LABEL[level]}</span>
                        </button>
                    );
                })}
                {myTeams.length === 0 && <div style={{ padding: '4px 9px', fontSize: 12, color: 'var(--fg3)' }}>No teams yet.</div>}
            </div>

            <div style={{ marginTop: 'auto', padding: 8, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button type="button" onClick={onOpenSettings} style={footerBtn(settingsActive)} className={settingsActive ? '' : 'hover:bg-hover'}>
                    Notification settings
                </button>
                <Link to="/" style={footerBtn(false)} className="hover:bg-hover">
                    ← Back to Issues
                </Link>
            </div>
        </>
    );
}
