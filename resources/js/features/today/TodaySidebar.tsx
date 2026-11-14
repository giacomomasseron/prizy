import type { CSSProperties, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { canDevelop as canDevelopFor, canUseTracker, trackerEnabled } from '../../auth/capabilities';
import { useMe } from '../../auth/useAuth';
import { MyProjects, MyTeams, NAV_COLUMN, NavIcon, type NavIconName, RED_BADGE, ROW, ROW_HOVER, SUB_ROW } from '../../components/SidebarNav';
import { BrandMark } from '../../components/ui/BrandMark';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { UserMenu } from '../../components/UserMenu';
import { hiBadge } from '../../components/sidebarStyles';
import { useIssueDrawers } from '../issues/useIssueDrawers';
import { useUnreadCount } from '../notifications/hooks';
import { useMyProjects } from '../projects/hooks';
import { useWorkspace } from '../settings/hooks';
import { WorkspaceMark } from '../setup/WorkspaceMark';
import { useTeams } from '../teams/hooks';
import { usePlan } from './planHooks';

const LABEL: CSSProperties = { padding: '20px 12px 6px', fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };
const ONE_LINE: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function Row({ to, icon, label, children, ...rest }: { to: string; icon: NavIconName; label: string; children?: ReactNode; 'aria-label'?: string }) {
    return (
        <Link to={to} className={ROW_HOVER} style={ROW} {...rest}>
            <NavIcon name={icon} /><span style={{ flex: 1 }}>{label}</span>{children}
        </Link>
    );
}

/** The « button's id: AppLayout puts the focus back on it when the Menu pill brings the bar back. */
export const HIDE_ID = 'today-sidebar-hide';

/**
 * Today's own left bar (the Today v2 design): the workspace card, which opens its settings; Today with the plan count,
 * Inbox, My issues, My teams, My projects with what each holds of today's plan, and Escalations; the workspace's
 * Issues, Projects and Roadmap; and you, your team and the theme. Cycles are reached from a team. « (or `[`, wired in AppLayout) hides it.
 */
export function TodaySidebar({ onHide }: { onHide: () => void }) {
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    // AppLayout mounts the bar before RequireDeveloper redirects a non-tracker user: ask for nothing tracker-only.
    const tracker = canUseTracker(me.data);
    const { openCreate } = useIssueDrawers();
    const plan = usePlan(tracker);
    const unread = useUnreadCount(trackerEnabled(me.data));
    const projects = useMyProjects({ enabled: tracker });
    const teams = useTeams({ mine: true, enabled: trackerEnabled(me.data) });
    // Every member may read it. No card until it answers, and none if it fails.
    const workspace = useWorkspace();

    const items = plan.data?.items ?? [];
    const unreadCount = unread.data?.count ?? 0;
    const team = teams.data?.items[0];

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px' }}>
                <BrandMark />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-.03em' }}>Prizy</span>
                <button
                    type="button"
                    id={HIDE_ID}
                    aria-label="Hide sidebar"
                    title="Hide sidebar ( [ )"
                    onClick={onHide}
                    className="bg-transparent text-fg3 hover:bg-hover hover:text-fg"
                    style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'inherit' }}
                >
                    «
                </button>
            </div>

            {workspace.data && (
                <Link
                    to="/settings/general"
                    title="Workspace settings"
                    className="bg-panel text-fg hover:bg-hover"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', margin: '0 0 14px', borderRadius: 14, boxShadow: '0 1px 0 var(--border)', textDecoration: 'none' }}
                >
                    <WorkspaceMark name={workspace.data.name} color={workspace.data.color} small />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                        <span style={{ ...ONE_LINE, fontWeight: 700, fontSize: 14 }}>{workspace.data.name}</span>
                        {/* The address it is served at: the page's own host, as Setup shows it. */}
                        <span style={{ ...ONE_LINE, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg3)' }}>{window.location.host}</span>
                    </span>
                </Link>
            )}

            {canDevelop && (
                <button
                    type="button"
                    onClick={() => openCreate()}
                    className="bg-fg text-bg hover:bg-accent"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-pill)', border: 'none', fontWeight: 700, fontSize: 14.5, marginBottom: 18, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .12s' }}
                >
                    + New issue
                </button>
            )}

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', margin: '0 -6px', padding: '0 6px' }}>
                <nav aria-label="Your work" style={NAV_COLUMN}>
                    <NavLink
                        to="/today"
                        className={({ isActive }) => (isActive ? 'text-fg' : ROW_HOVER)}
                        style={({ isActive }) => ({ ...ROW, ...(isActive ? { background: 'var(--panel)', fontWeight: 700, boxShadow: '0 1px 0 var(--border)' } : {}) })}
                    >
                        <NavIcon name="today" /><span style={{ flex: 1 }}>Today</span>
                        <span data-testid="today-badge" aria-label={`${items.length} planned`} style={{ ...hiBadge, fontSize: 12.5 }}>{items.length}</span>
                    </NavLink>
                    <Row to="/notifications" icon="inbox" label="Inbox" aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} unread` : 'Inbox'}>
                        {unreadCount > 0 && <span style={RED_BADGE}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Row>
                    <Row to={me.data?.id ? `/issues?assignee_id=${me.data.id}` : '/issues'} icon="me" label="My issues" />
                    <MyTeams teams={teams.data?.items ?? []} />
                    <MyProjects projects={projects.data?.items ?? []} plan={items} />
                    {/* The issues that came from Support; gone when the workspace has no support desk. */}
                    {workspace.data?.helpdesk_enabled !== false && <Row to="/issues?escalated=true" icon="escalations" label="Escalations" />}
                </nav>

                <div id="today-nav-workspace" style={LABEL}>Workspace</div>
                <nav aria-labelledby="today-nav-workspace" style={NAV_COLUMN}>
                    <Link to="/issues" className={ROW_HOVER} style={SUB_ROW}><NavIcon name="issues" />Issues</Link>
                    <Link to="/projects" className={ROW_HOVER} style={SUB_ROW}><NavIcon name="projects" />Projects</Link>
                    <Link to="/roadmap" className={ROW_HOVER} style={SUB_ROW}><NavIcon name="roadmap" />Roadmap</Link>
                </nav>
            </div>

            <div style={{ flexShrink: 0, padding: '12px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserMenu subtitle={team?.name ?? 'Prizy workspace'} />
                <ThemeToggle variant="outlined" />
            </div>
        </>
    );
}
