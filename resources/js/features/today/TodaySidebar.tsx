import type { CSSProperties } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { canDevelop as canDevelopFor } from '../../auth/capabilities';
import { useMe } from '../../auth/useAuth';
import { BrandMark } from '../../components/ui/BrandMark';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { UserMenu } from '../../components/UserMenu';
import { hiBadge } from '../../components/sidebarStyles';
import type { PlanItem, Project } from '../../lib/types';
import { useIssueDrawers } from '../issues/useIssueDrawers';
import { useUnreadCount } from '../notifications/hooks';
import { ProjectBadge } from '../projects/ProjectBadge';
import { useMyProjects } from '../projects/hooks';
import { useTeams } from '../teams/hooks';
import { usePlan } from './planHooks';

/** A row of the left bar. Colour and hover are classes: an inline colour or background would beat the hover. */
const ROW: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 'var(--radius-row)', fontSize: 15, fontWeight: 600, textDecoration: 'none' };
const ROW_HOVER = 'text-fg2 hover:bg-hover hover:text-fg';
const LABEL: CSSProperties = { padding: '20px 12px 6px', fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' };
const RED_BADGE: CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--on-accent)', background: 'var(--red)', borderRadius: 'var(--radius-pill)', padding: '0 7px' };

interface MyProject { id: string; name: string; color: string; today: number }

/** Your projects and those on today's plan, by name, each with how many of today's issues are in it. */
function myProjects(projects: Project[], plan: PlanItem[]): MyProject[] {
    const byId = new Map<string, MyProject>();
    for (const p of projects) byId.set(p.id, { id: p.id, name: p.name, color: p.color, today: 0 });
    for (const { issue } of plan) {
        if (!issue.project) continue;
        const row = byId.get(issue.project.id) ?? { ...issue.project, today: 0 };
        byId.set(row.id, { ...row, today: row.today + 1 });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Today's own left bar (the Today v2 design): Today with the plan count, My issues, Inbox and Escalations; the
 * workspace's Issues, Cycles and Projects; My projects with what each holds of today's plan; and you, your team and
 * the theme. « (or `[`, wired in AppLayout) hides it.
 */
export function TodaySidebar({ onHide }: { onHide: () => void }) {
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const { openCreate } = useIssueDrawers();
    const plan = usePlan();
    const unread = useUnreadCount();
    const projects = useMyProjects();
    const teams = useTeams({ mine: true });

    const items = plan.data?.items ?? [];
    const unreadCount = unread.data?.count ?? 0;
    const team = teams.data?.items[0];
    const mine = myProjects(projects.data?.items ?? [], items);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px' }}>
                <BrandMark />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, letterSpacing: '-.03em' }}>Prizy</span>
                <button
                    type="button"
                    aria-label="Hide sidebar"
                    title="Hide sidebar ( [ )"
                    onClick={onHide}
                    className="bg-transparent text-fg3 hover:bg-hover hover:text-fg"
                    style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'inherit' }}
                >
                    «
                </button>
            </div>

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
                <nav aria-label="Your work" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <NavLink
                        to="/today"
                        className={({ isActive }) => (isActive ? 'text-fg' : ROW_HOVER)}
                        style={({ isActive }) => ({ ...ROW, padding: '8px 12px', ...(isActive ? { background: 'var(--panel)', fontWeight: 700, boxShadow: '0 1px 0 var(--border)' } : {}) })}
                    >
                        <span style={{ flex: 1 }}>Today</span>
                        <span data-testid="today-badge" aria-label={`${items.length} planned`} style={{ ...hiBadge, fontSize: 12.5 }}>{items.length}</span>
                    </NavLink>
                    <Link to={me.data?.id ? `/issues?assignee_id=${me.data.id}` : '/issues'} className={ROW_HOVER} style={{ ...ROW, padding: '8px 12px' }}>
                        <span style={{ flex: 1 }}>My issues</span>
                    </Link>
                    <Link to="/notifications" aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} unread` : 'Inbox'} className={ROW_HOVER} style={{ ...ROW, padding: '8px 12px' }}>
                        <span style={{ flex: 1 }}>Inbox</span>
                        {unreadCount > 0 && <span style={RED_BADGE}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </Link>
                    <button type="button" disabled aria-disabled="true" title="Coming soon" className="text-fg2" style={{ ...ROW, padding: '8px 12px', border: 'none', background: 'none', opacity: 0.5, cursor: 'default', textAlign: 'left', fontFamily: 'inherit' }}>
                        <span style={{ flex: 1 }}>Escalations</span>
                    </button>
                </nav>

                <div id="today-nav-workspace" style={LABEL}>Workspace</div>
                <nav aria-labelledby="today-nav-workspace" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Link to="/issues" className={ROW_HOVER} style={{ ...ROW, padding: '7px 12px' }}>Issues</Link>
                    <Link to={team ? `/teams/${team.id}/cycles` : '/teams'} className={ROW_HOVER} style={{ ...ROW, padding: '7px 12px' }}>Cycles</Link>
                    <Link to="/projects" className={ROW_HOVER} style={{ ...ROW, padding: '7px 12px' }}>Projects</Link>
                </nav>

                {mine.length > 0 && (
                    <>
                        <div id="today-nav-projects" style={LABEL}>My projects</div>
                        <nav aria-labelledby="today-nav-projects" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {mine.map((p) => (
                                <Link key={p.id} to={`/projects/${p.id}`} className={ROW_HOVER} style={{ ...ROW, padding: '7px 12px' }}>
                                    <ProjectBadge name={p.name} color={p.color} size={22} square />
                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                    {p.today > 0 && (
                                        <span title="On today’s plan" style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg3)' }}>
                                            {p.today}<span className="sr-only"> on today’s plan</span>
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </nav>
                    </>
                )}
            </div>

            <div style={{ flexShrink: 0, padding: '12px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserMenu variant="full" subtitle={team?.name ?? 'Prizy workspace'} />
                <ThemeToggle variant="outlined" />
            </div>
        </>
    );
}
