import { useEffect, useState, type CSSProperties } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useMe } from '../auth/useAuth';
import { useIssueDrawers } from '../features/issues/useIssueDrawers';
import { useIssues } from '../features/issues/hooks';
import { useUnreadCount } from '../features/notifications/hooks';
import { useTeams } from '../features/teams/hooks';
import { SidebarFooter } from './SidebarFooter';
import { Kbd } from './ui/Kbd';

function persistedBool(key: string, def: boolean): boolean {
    try { const v = localStorage.getItem(key); return v === null ? def : v === '1'; } catch { return def; }
}
function persistBool(key: string, val: boolean) { try { localStorage.setItem(key, val ? '1' : '0'); } catch { /* ignore */ } }
function persistedExp(): Record<string, boolean> {
    try { return JSON.parse(localStorage.getItem('prizy-nav-teamexp') || '{}'); } catch { return {}; }
}

const rowStyle = (active: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 9px', borderRadius: 7, border: 'none', background: active ? 'var(--hover)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg2)', fontSize: 12.8, fontWeight: 500, fontFamily: 'inherit', textDecoration: 'none', cursor: 'pointer', textAlign: 'left' });
const sectionBtn: CSSProperties = { border: 'none', background: 'none', color: 'var(--fg3)', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' };
const countStyle: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };
const caret = (open: boolean): CSSProperties => ({ fontSize: 7, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' });
const box = (c: string): CSSProperties => ({ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' });

export function GlobalSidebar({ onCollapse }: { onCollapse: () => void }) {
    const me = useMe();
    const { openCreate } = useIssueDrawers();
    const { data: issuesData } = useIssues();
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 12px 11px' }}>
                <div style={{ width: 23, height: 23, borderRadius: 6, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>P</div>
                <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-.01em' }}>Prizy</span>
                <button type="button" title="Collapse sidebar" aria-label="Collapse sidebar" onClick={onCollapse} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: 'var(--fg2)', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 15 }} className="hover:bg-hover">◧</button>
                <button type="button" title="Search (⌘K)" aria-label="Search" onClick={openSearch} style={{ border: 'none', background: 'none', color: 'var(--fg2)', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 15 }} className="hover:bg-hover">⌕</button>
            </div>

            {/* New issue */}
            <div style={{ padding: '0 10px 10px' }}>
                <button type="button" onClick={() => openCreate()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }} className="hover:border-border2">
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>+</span>
                    New issue<span style={{ marginLeft: 'auto' }}><Kbd>C</Kbd></span>
                </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {/* Support bridge */}
                <div style={{ padding: '14px 18px 6px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' }}>Support bridge</div>
                <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <NavLink to={me.data?.id ? `/?assignee_id=${me.data.id}` : '/'} style={({ isActive }) => rowStyle(false)} className="hover:bg-hover">
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={box('var(--accent)')} /></span>
                        <span style={{ flex: 1 }}>My Issues</span><span style={countStyle}>{myCount}</span>
                    </NavLink>
                    <button type="button" disabled aria-disabled="true" title="Coming soon" style={{ ...rowStyle(false), opacity: 0.5, cursor: 'default' }}>
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>↩</span><span style={{ flex: 1 }}>Escalations</span>
                        <span style={{ fontSize: 9.5, color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 5px' }}>Soon</span>
                    </button>
                    <div style={{ ...rowStyle(false), opacity: 0.55, cursor: 'default' }}>
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, border: '1.5px solid currentColor' }} /></span>
                        <span style={{ flex: 1 }}>Support inbox</span><span style={{ fontSize: 9.5, color: 'var(--fg3)', border: '1px solid var(--border2)', borderRadius: 4, padding: '1px 5px' }}>Zendesk</span>
                    </div>
                </div>

                {/* Inbox (preserved — mockup omits it, we keep notifications reachable) */}
                <div style={{ padding: '8px 8px 0' }}>
                    <NavLink to="/notifications" style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')} aria-label="Inbox">
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>✉</span><span style={{ flex: 1 }}>Inbox</span>
                        {unreadCount > 0 && <span data-testid="inbox-badge" style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 20, padding: '1px 7px' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    </NavLink>
                </div>

                {/* Workspace */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 12px 5px 18px' }}>
                    <button type="button" onClick={() => setWorkspaceOpen((o) => !o)} style={sectionBtn} className="hover:text-fg2"><span aria-hidden="true" style={caret(workspaceOpen)}>▶</span>Workspace</button>
                </div>
                {workspaceOpen && (
                    <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <NavLink to="/" end style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                            <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 13, height: 13, borderRadius: 3, border: '1.6px solid currentColor' }} /></span>
                            <span style={{ flex: 1 }}>Issues</span>{activeCount > 0 && <span style={countStyle}>{activeCount}</span>}
                        </NavLink>
                        <NavLink to="/projects" style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                            <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 13, height: 13, borderRadius: 3, background: 'currentColor', opacity: 0.85 }} /></span>
                            <span style={{ flex: 1 }}>Projects</span>
                        </NavLink>
                        <NavLink to="/roadmap" style={({ isActive }) => rowStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                            <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>≣</span><span style={{ flex: 1 }}>Roadmap</span>
                        </NavLink>
                    </nav>
                )}

                {/* My Teams */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 12px 5px 18px' }}>
                    <button type="button" onClick={() => setTeamsOpen((o) => !o)} style={sectionBtn} className="hover:text-fg2"><span aria-hidden="true" style={caret(teamsOpen)}>▶</span>My Teams</button>
                    {canManage && <Link to="/settings/teams" title="New team" aria-label="New team" style={{ marginLeft: 'auto', color: 'var(--fg3)', width: 22, height: 22, borderRadius: 6, fontSize: 16, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} className="hover:bg-hover">+</Link>}
                </div>
                {teamsOpen && (
                    <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {myTeams.map((t) => {
                            const expanded = !!teamExp[t.id];
                            return (
                                <div key={t.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <button type="button" onClick={() => setTeamExp((m) => ({ ...m, [t.id]: !m[t.id] }))} style={rowStyle(false)} className="hover:bg-hover">
                                        <span aria-hidden="true" style={{ width: 12, ...caret(expanded), justifyContent: 'center', display: 'inline-flex' }}>▶</span>
                                        <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: t.color, display: 'inline-block' }} /></span>
                                        <span style={{ flex: 1, textAlign: 'left' }}>{t.name}</span>
                                        {t.member_count != null && <span style={countStyle}>{t.member_count}</span>}
                                    </button>
                                    {expanded && (
                                        <div data-testid={`team-links-${t.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 20 }}>
                                            <Link to={`/?team_id=${t.id}`} style={{ ...rowStyle(false), padding: '5px 9px', fontSize: 12.4 }} className="hover:bg-hover"><span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>▤</span><span style={{ flex: 1 }}>Issues</span></Link>
                                            <Link to={`/teams/${t.id}/cycles`} style={{ ...rowStyle(false), padding: '5px 9px', fontSize: 12.4 }} className="hover:bg-hover"><span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>◔</span><span style={{ flex: 1 }}>Cycles</span></Link>
                                            <Link to={`/projects?team_id=${t.id}`} style={{ ...rowStyle(false), padding: '5px 9px', fontSize: 12.4 }} className="hover:bg-hover"><span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>▦</span><span style={{ flex: 1 }}>Projects</span></Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {myTeams.length === 0 && <div style={{ padding: '4px 9px', fontSize: 12, color: 'var(--fg3)' }}>No teams yet.</div>}
                    </div>
                )}
            </div>

            <SidebarFooter />
        </>
    );
}
