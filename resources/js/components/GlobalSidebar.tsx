import { useEffect, useState, type CSSProperties } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { canDevelop as canDevelopFor, canUseTracker, canWorkHelpdesk } from '../auth/capabilities';
import { useMe } from '../auth/useAuth';
import { useIssueDrawers } from '../features/issues/useIssueDrawers';
import { useIssues } from '../features/issues/hooks';
import { useUnreadCount } from '../features/notifications/hooks';
import { useTeams } from '../features/teams/hooks';
import { SidebarFooter } from './SidebarFooter';
import { BrandMark } from './ui/BrandMark';
import { Kbd } from './ui/Kbd';
import { NAV_ROW_HOVER, countStyle, hiBadge, navRow, sectionBtn, sectionLabel, tagBadge } from './sidebarStyles';

function persistedBool(key: string, def: boolean): boolean {
    try { const v = localStorage.getItem(key); return v === null ? def : v === '1'; } catch { return def; }
}
function persistBool(key: string, val: boolean) { try { localStorage.setItem(key, val ? '1' : '0'); } catch { /* ignore */ } }
function persistedExp(): Record<string, boolean> {
    try { return JSON.parse(localStorage.getItem('prizy-nav-teamexp') || '{}'); } catch { return {}; }
}

const caret = (open: boolean): CSSProperties => ({ fontSize: 7, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' });
const box = (c: string): CSSProperties => ({ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' });

export function GlobalSidebar({ onCollapse }: { onCollapse: () => void }) {
    const me = useMe();
    const showTracker = canUseTracker(me.data);
    const canDevelop = canDevelopFor(me.data);
    const { openCreate } = useIssueDrawers();
    const { data: issuesData } = useIssues({}, { enabled: showTracker });
    const unread = useUnreadCount();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const teams = useTeams({ mine: true });

    const [workspaceOpen, setWorkspaceOpen] = useState(() => persistedBool('prizy-nav-workspace', true));
    const [teamsOpen, setTeamsOpen] = useState(() => persistedBool('prizy-nav-teams', true));
    const [teamExp, setTeamExp] = useState<Record<string, boolean>>(persistedExp);
    useEffect(() => persistBool('prizy-nav-workspace', workspaceOpen), [workspaceOpen]);
    useEffect(() => persistBool('prizy-nav-teams', teamsOpen), [teamsOpen]);
    useEffect(() => { try { localStorage.setItem('prizy-nav-teamexp', JSON.stringify(teamExp)); } catch { /* ignore */ } }, [teamExp]);

    const issues = issuesData?.items ?? [];
    const activeCount = issues.filter((i) => i.status !== 'done' && i.status !== 'cancelled').length;
    const myCount = me.data?.id ? issues.filter((i) => i.assignee_id === me.data!.id).length : 0;
    const unreadCount = unread.data?.count ?? 0;
    const myTeams = teams.data?.items ?? [];

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

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {/* Support bridge — mirrors Prizy.dc.html: My Issues · Escalations · Inbox · Support inbox */}
                <div style={{ ...sectionLabel, padding: '6px 18px 6px' }}>Support bridge</div>
                <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {showTracker && (
                        <NavLink to={me.data?.id ? `/?assignee_id=${me.data.id}` : '/'} style={() => navRow(false)} className={NAV_ROW_HOVER}>
                            <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={box('var(--accent)')} /></span>
                            <span style={{ flex: 1 }}>My Issues</span><span style={countStyle}>{myCount}</span>
                        </NavLink>
                    )}
                    {showTracker && (
                        <button type="button" disabled aria-disabled="true" title="Coming soon" style={{ ...navRow(false), opacity: 0.5, cursor: 'default' }}>
                            <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>↩</span><span style={{ flex: 1 }}>Escalations</span>
                            <span style={tagBadge}>Soon</span>
                        </button>
                    )}
                    {/* Inbox → notifications (design folds this into the Support bridge with the ◔ glyph) */}
                    <NavLink to="/notifications" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)} aria-label="Inbox">
                        <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>◔</span><span style={{ flex: 1 }}>Inbox</span>
                        {unreadCount > 0 && <span data-testid="inbox-badge" style={hiBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </NavLink>
                    {/* Support inbox → agent desk (design: outlined-square glyph + "Agent" badge); agent-gated so non-agents get no dead /support link */}
                    {canWorkHelpdesk(me.data) && (
                        <>
                            <NavLink to="/support" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px solid currentColor' }} /></span>
                                <span style={{ flex: 1 }}>Support inbox</span>
                                <span style={tagBadge}>Agent</span>
                            </NavLink>
                            <NavLink to="/support/kb" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>📚</span>
                                <span style={{ flex: 1 }}>Knowledge base</span>
                            </NavLink>
                            <a href="/help" target="_blank" rel="noreferrer" style={navRow(false)} className={NAV_ROW_HOVER}>
                                <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>◎</span>
                                <span style={{ flex: 1 }}>Help center</span>
                                <span style={tagBadge}>Public</span>
                            </a>
                        </>
                    )}
                </div>

                {/* Workspace */}
                {showTracker && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 12px 5px 18px' }}>
                            <button type="button" onClick={() => setWorkspaceOpen((o) => !o)} aria-expanded={workspaceOpen} style={sectionBtn} className="text-fg3 hover:text-fg2"><span aria-hidden="true" style={caret(workspaceOpen)}>▶</span>Workspace</button>
                        </div>
                        {workspaceOpen && (
                            <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <NavLink to="/" end style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 13, height: 13, borderRadius: 3, border: '1.6px solid currentColor' }} /></span>
                                    <span style={{ flex: 1 }}>Issues</span>{activeCount > 0 && <span style={countStyle}>{activeCount}</span>}
                                </NavLink>
                                <NavLink to="/projects" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 13, height: 13, borderRadius: 3, background: 'currentColor', opacity: 0.85 }} /></span>
                                    <span style={{ flex: 1 }}>Projects</span>
                                </NavLink>
                                <NavLink to="/roadmap" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                    <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>≣</span><span style={{ flex: 1 }}>Roadmap</span>
                                </NavLink>
                                <NavLink to="/analytics" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                    <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>◫</span><span style={{ flex: 1 }}>Analytics</span>
                                </NavLink>
                                <NavLink to="/releases" style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                                    <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>⛴</span><span style={{ flex: 1 }}>Releases</span>
                                </NavLink>
                            </nav>
                        )}
                    </>
                )}

                {/* My Teams */}
                {showTracker && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 12px 5px 18px' }}>
                            <button type="button" onClick={() => setTeamsOpen((o) => !o)} aria-expanded={teamsOpen} style={sectionBtn} className="text-fg3 hover:text-fg2"><span aria-hidden="true" style={caret(teamsOpen)}>▶</span>My Teams</button>
                            {canManage && <Link to="/settings/teams" title="New team" aria-label="New team" style={{ marginLeft: 'auto', color: 'var(--fg3)', width: 22, height: 22, borderRadius: 6, fontSize: 16, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} className="hover:bg-hover">+</Link>}
                        </div>
                        {teamsOpen && (
                            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {myTeams.map((t) => {
                                    const expanded = !!teamExp[t.id];
                                    return (
                                        <div key={t.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                            <button type="button" onClick={() => setTeamExp((m) => ({ ...m, [t.id]: !m[t.id] }))} aria-expanded={expanded} style={navRow(false)} className={NAV_ROW_HOVER}>
                                                <span aria-hidden="true" style={{ width: 12, ...caret(expanded), justifyContent: 'center', display: 'inline-flex' }}>▶</span>
                                                <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: t.color, display: 'inline-block' }} /></span>
                                                <span style={{ flex: 1, textAlign: 'left' }}>{t.name}</span>
                                                {t.member_count != null && <span style={countStyle}>{t.member_count}</span>}
                                            </button>
                                            {expanded && (
                                                <div data-testid={`team-links-${t.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 20 }}>
                                                    <Link to={`/?team_id=${t.id}`} style={{ ...navRow(false), padding: '6px 12px', fontSize: 13.5 }} className={NAV_ROW_HOVER}><span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>▤</span><span style={{ flex: 1 }}>Issues</span></Link>
                                                    <Link to={`/teams/${t.id}/cycles`} style={{ ...navRow(false), padding: '6px 12px', fontSize: 13.5 }} className={NAV_ROW_HOVER}><span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>◔</span><span style={{ flex: 1 }}>Cycles</span></Link>
                                                    <Link to={`/projects?team_id=${t.id}`} style={{ ...navRow(false), padding: '6px 12px', fontSize: 13.5 }} className={NAV_ROW_HOVER}><span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>▦</span><span style={{ flex: 1 }}>Projects</span></Link>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {myTeams.length === 0 && <div style={{ padding: '4px 9px', fontSize: 12, color: 'var(--fg3)' }}>No teams yet.</div>}
                            </div>
                        )}
                    </>
                )}
            </div>

            <SidebarFooter />
        </>
    );
}
