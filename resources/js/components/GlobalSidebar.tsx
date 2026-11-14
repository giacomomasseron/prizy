import { Link, NavLink, useLocation } from 'react-router-dom';
import { canDevelop as canDevelopFor, canUseTracker, canWorkHelpdesk, trackerEnabled } from '../auth/capabilities';
import { useMe } from '../auth/useAuth';
import { useIssueDrawers } from '../features/issues/useIssueDrawers';
import { useIssues } from '../features/issues/hooks';
import { useUnreadCount } from '../features/notifications/hooks';
import { useMyProjects } from '../features/projects/hooks';
import { useTeams } from '../features/teams/hooks';
import { usePlan } from '../features/today/planHooks';
import { SidebarFooter } from './SidebarFooter';
import { COUNT_PILL, MyProjects, MyTeams, NAV_COLUMN, NavIcon, type NavIconName, RED_BADGE, rowClass, rowStyle, useFolded } from './SidebarNav';
import { BrandMark } from './ui/BrandMark';
import { Kbd } from './ui/Kbd';
import { hiBadge, sectionBtn, tagBadge } from './sidebarStyles';

/** A row that is current on its own route. */
function PageRow({ to, icon, children }: { to: string; icon: NavIconName; children: string }) {
    return (
        <NavLink to={to} style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => rowClass(isActive)}>
            <NavIcon name={icon} /><span style={{ flex: 1 }}>{children}</span>
        </NavLink>
    );
}

/**
 * The left bar of every page but Today and a project (the Workspace design): your own work first (Today, Inbox, My
 * issues, My teams, My projects, Escalations), then the workspace's Issues, Projects and Roadmap, then the support
 * desk for agents. Analytics, Releases and Help center are the app's own; the mockup has no such pages.
 */
export function GlobalSidebar({ onCollapse }: { onCollapse: () => void }) {
    const me = useMe();
    const showTracker = canUseTracker(me.data);
    // Notifications are all about the tracker: a workspace that switched it off has no inbox.
    const showInbox = trackerEnabled(me.data);
    const canDevelop = canDevelopFor(me.data);
    const { openCreate } = useIssueDrawers();
    const { data: issuesData } = useIssues({}, { enabled: showTracker });
    // Escalations: the issues that came from Support. The row goes when the workspace has no support desk.
    const showEscalations = showTracker && me.data?.workspace?.helpdesk_enabled === true;
    const showDesk = canWorkHelpdesk(me.data);
    // Which issue view is open: the plain one, the "From Support" scope, or the caller's own issues.
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const onIssues = location.pathname === '/issues' || location.pathname === '/board';
    const supportMode = onIssues && query.get('escalated') === 'true';
    const mineMode = onIssues && !!me.data?.id && query.get('assignee_id') === me.data.id;
    const issuesCurrent = location.pathname === '/issues' && !supportMode && !mineMode;
    const unread = useUnreadCount(!!me.data && showInbox);
    const plan = usePlan(showTracker);
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const teams = useTeams({ mine: true, enabled: showTracker });
    const projects = useMyProjects({ enabled: showTracker });
    const [workspaceOpen, toggleWorkspace] = useFolded('prizy-nav-workspace');

    const myCount = me.data?.id ? (issuesData?.items ?? []).filter((i) => i.assignee_id === me.data!.id).length : 0;
    const unreadCount = unread.data?.count ?? 0;
    const planCount = plan.data?.items.length ?? 0;

    function openSearch() { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })); }

    return (
        <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 18px' }}>
                <BrandMark />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-.03em' }}>Prizy</span>
                <button type="button" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={onCollapse} style={{ marginLeft: 'auto', border: 'none', color: 'var(--fg2)', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 15 }} className="bg-transparent hover:bg-hover">◧</button>
                <button type="button" title="Search (⌘K)" aria-label="Search" onClick={openSearch} style={{ border: 'none', color: 'var(--fg2)', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }} className="bg-transparent hover:bg-hover">⌕</button>
            </div>

            {/* New issue */}
            {canDevelop && (
                <div style={{ padding: '0 6px 16px' }}>
                    <button type="button" onClick={() => openCreate()} className="bg-fg text-bg hover:bg-accent" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-pill)', border: 'none', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .12s' }}>
                        + New issue<Kbd>C</Kbd>
                    </button>
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 6px' }}>
                {(showTracker || showInbox) && (
                    <nav aria-label="Your work" style={NAV_COLUMN}>
                        {/* Today: the tracker user's home, with the open plan count. */}
                        {showTracker && (
                            <NavLink to="/today" style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => rowClass(isActive)}>
                                <NavIcon name="today" /><span style={{ flex: 1 }}>Today</span>
                                {planCount > 0 && <span data-testid="today-badge" aria-label={`${planCount} planned`} style={{ ...hiBadge, fontSize: 12.5 }}>{planCount}</span>}
                            </NavLink>
                        )}
                        {showInbox && (
                            <NavLink to="/notifications" aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} unread` : 'Inbox'} style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => rowClass(isActive)}>
                                <NavIcon name="inbox" /><span style={{ flex: 1 }}>Inbox</span>
                                {unreadCount > 0 && <span data-testid="inbox-badge" style={RED_BADGE}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                            </NavLink>
                        )}
                        {showTracker && (
                            <Link to={me.data?.id ? `/issues?assignee_id=${me.data.id}` : '/issues'} aria-current={mineMode ? 'page' : undefined} style={rowStyle(mineMode)} className={rowClass(mineMode)}>
                                <NavIcon name="me" /><span style={{ flex: 1 }}>My issues</span>
                                {myCount > 0 && <span data-testid="my-issues-count" style={COUNT_PILL}>{myCount}</span>}
                            </Link>
                        )}
                        {showTracker && <MyTeams teams={teams.data?.items ?? []} newTeam={canManage} />}
                        {showTracker && <MyProjects projects={projects.data?.items ?? []} />}
                        {showEscalations && (
                            <Link to="/issues?escalated=true" aria-current={supportMode ? 'page' : undefined} style={rowStyle(supportMode)} className={rowClass(supportMode)}>
                                <NavIcon name="escalations" /><span style={{ flex: 1 }}>Escalations</span>
                            </Link>
                        )}
                    </nav>
                )}

                {showTracker && (
                    <>
                        <button type="button" onClick={toggleWorkspace} aria-expanded={workspaceOpen} style={{ ...sectionBtn, padding: '20px 12px 6px', gap: 5 }} className="text-fg3 hover:text-fg2">
                            <span aria-hidden="true" style={{ fontSize: 7, display: 'inline-block', transition: 'transform .15s', transform: workspaceOpen ? 'rotate(90deg)' : 'none' }}>▶</span>Workspace
                        </button>
                        {workspaceOpen && (
                            <nav aria-label="Workspace" style={NAV_COLUMN}>
                                {/* Not the current row inside the "From Support" scope or on your own issues: those rows are. */}
                                <Link to="/issues" aria-current={issuesCurrent ? 'page' : undefined} style={rowStyle(issuesCurrent)} className={rowClass(issuesCurrent)}>
                                    <NavIcon name="issues" /><span style={{ flex: 1 }}>Issues</span>
                                </Link>
                                <PageRow to="/projects" icon="projects">Projects</PageRow>
                                <PageRow to="/roadmap" icon="roadmap">Roadmap</PageRow>
                                <PageRow to="/analytics" icon="analytics">Analytics</PageRow>
                                <PageRow to="/releases" icon="releases">Releases</PageRow>
                            </nav>
                        )}
                    </>
                )}

                {/* The support desk: agent-gated, so nobody else gets a dead /support link. */}
                {showDesk && (
                    <nav aria-label="Support" style={{ ...NAV_COLUMN, paddingTop: showTracker || showInbox ? 16 : 0 }}>
                        <PageRow to="/support" icon="support">Support inbox</PageRow>
                        <PageRow to="/support/kb" icon="kb">Knowledge base</PageRow>
                        <a href="/help" target="_blank" rel="noreferrer" style={rowStyle(false)} className={rowClass(false)}>
                            <NavIcon name="help" /><span style={{ flex: 1 }}>Help center</span><span style={tagBadge}>Public</span>
                        </a>
                    </nav>
                )}
            </div>

            <SidebarFooter />
        </>
    );
}
