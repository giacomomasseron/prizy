import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ProjectBadge } from '../features/projects/ProjectBadge';
import type { PlanItem, Team } from '../lib/types';

/**
 * The parts the two main left bars share (the shared one and Today's own): the rows, their line icons, and the
 * "My teams" and "My projects" groups that fold away. What is folded is remembered per browser, for both bars.
 */

/** A row. Colour and hover are classes: an inline colour or background would beat the hover. */
export const ROW: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-row)', border: 'none',
    fontSize: 15, fontWeight: 600, fontFamily: 'inherit', textDecoration: 'none', textAlign: 'left', cursor: 'pointer',
};
/** A row one level in (a team's links, a project), and the rows of Today's Workspace group. */
export const SUB_ROW: CSSProperties = { ...ROW, padding: '7px 12px' };
export const ROW_HOVER = 'bg-transparent text-fg2 hover:bg-hover hover:text-fg';
/** The row of the page you are on: a panel card, in the text colour. The ring is 3:1 against the bar (G3b). */
export const ROW_CURRENT: CSSProperties = { background: 'var(--panel)', fontWeight: 700, boxShadow: '0 0 0 1.5px var(--field)' };
export const ROW_CURRENT_CLASS = 'text-fg';

export const rowStyle = (current: boolean): CSSProperties => (current ? { ...ROW, ...ROW_CURRENT } : ROW);
export const rowClass = (current: boolean): string => (current ? ROW_CURRENT_CLASS : ROW_HOVER);

/** Unread count: white on red. */
export const RED_BADGE: CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--on-accent)', background: 'var(--red)', borderRadius: 'var(--radius-pill)', padding: '0 7px' };
/** A quiet count: the text colour on a panel pill. */
export const COUNT_PILL: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', background: 'var(--panel)', borderRadius: 'var(--radius-pill)', padding: '0 8px', boxShadow: '0 0 0 1.5px var(--border2)' };
export const NAV_COLUMN: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const ONE_LINE: CSSProperties = { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const ICONS = {
    today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></>,
    me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    teams: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
    projects: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    escalations: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
    issues: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
    cycles: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4h-4" /></>,
    roadmap: <path d="M4 6h10M4 12h16M4 18h7" />,
    support: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="2.5" y="14" width="4" height="6" rx="1.5" /><rect x="17.5" y="14" width="4" height="6" rx="1.5" /></>,
    kb: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M9 7h6" /></>,
    // Not in the mockups (the app has these pages, the mockups do not): drawn to match.
    analytics: <path d="M5 20V11M12 20V4M19 20v-6" />,
    releases: <><path d="M3 12V4h8l10 10-8 8z" /><path d="M7.5 7.5h.01" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2.9-1.2 1.8M12 17h.01" /></>,
};
export type NavIconName = keyof typeof ICONS;

/** A 16px line icon in the row's own colour. Decorative: the label is always next to it. */
export function NavIcon({ name }: { name: NavIconName }) {
    return (
        <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
        </span>
    );
}

/**
 * The fold caret: a small solid triangle, pointing right when shut and down when open. Drawn rather than typed: a
 * typed ▶ is drawn by whichever font has one, and on some devices that is a colour emoji. `color` is left out where
 * the caret takes the colour of the text beside it.
 */
export function Caret({ open, color }: { open: boolean; color?: string }) {
    return (
        <span aria-hidden="true" data-caret="" style={{ display: 'inline-flex', flexShrink: 0, color, transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'none' }}>
            <svg width="7" height="7" viewBox="0 0 7 7"><path d="M1 .5 6.5 3.5 1 6.5z" fill="currentColor" /></svg>
        </span>
    );
}

function stored<T>(key: string, fallback: T): T {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T; } catch { return fallback; }
}
function store(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }

/** Whether a group is open, remembered in this browser. `prizy-nav-*` values were '1'/'0' and still read as such. */
export function useFolded(key: string, openByDefault = true): [boolean, () => void] {
    const [open, setOpen] = useState(() => { const v = stored<unknown>(key, openByDefault); return v !== 0 && v !== false; });
    useEffect(() => store(key, open ? 1 : 0), [key, open]);
    return [open, () => setOpen((o) => !o)];
}

function GroupToggle({ icon, label, open, onToggle, grow = false }: { icon: NavIconName; label: string; open: boolean; onToggle: () => void; grow?: boolean }) {
    return (
        <button type="button" onClick={onToggle} aria-expanded={open} className={ROW_HOVER} style={grow ? { ...ROW, flex: 1, minWidth: 0 } : ROW}>
            <NavIcon name={icon} /><span style={{ flex: 1 }}>{label}</span><Caret open={open} color="var(--fg3)" />
        </button>
    );
}

const square = (color: string): CSSProperties => ({ width: 20, height: 20, borderRadius: 6, background: color, flexShrink: 0 });

function TeamLink({ to, icon, children }: { to: string; icon: NavIconName; children: ReactNode }) {
    return <Link to={to} className={ROW_HOVER} style={SUB_ROW}><NavIcon name={icon} />{children}</Link>;
}

/**
 * "My teams": the teams you are in. Each one opens to its own Issues, Cycles and Projects; cycles are reached only
 * from here. `newTeam` adds the + that takes an owner or admin to the team settings.
 */
export function MyTeams({ teams, newTeam = false }: { teams: Team[]; newTeam?: boolean }) {
    const [open, toggle] = useFolded('prizy-nav-teams');
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => stored('prizy-nav-teamexp', {}));
    useEffect(() => store('prizy-nav-teamexp', expanded), [expanded]);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <GroupToggle icon="teams" label="My teams" open={open} onToggle={toggle} grow />
                {newTeam && (
                    <Link to="/settings/teams" title="New team" aria-label="New team" className="text-fg3 hover:bg-hover hover:text-fg" style={{ width: 26, height: 26, borderRadius: 8, fontSize: 16, lineHeight: 1, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>+</Link>
                )}
            </div>
            {open && (
                <div role="group" aria-label="My teams" style={{ ...NAV_COLUMN, paddingLeft: 12 }}>
                    {teams.map((t) => {
                        const isOpen = !!expanded[t.id];
                        return (
                            <div key={t.id} style={NAV_COLUMN}>
                                <button type="button" onClick={() => setExpanded((m) => ({ ...m, [t.id]: !m[t.id] }))} aria-expanded={isOpen} className={ROW_HOVER} style={SUB_ROW}>
                                    <span aria-hidden="true" style={square(t.color)} />
                                    <span style={ONE_LINE}>{t.name}</span>
                                    <Caret open={isOpen} color="var(--fg3)" />
                                </button>
                                {isOpen && (
                                    <div data-testid={`team-links-${t.id}`} style={{ ...NAV_COLUMN, paddingLeft: 12 }}>
                                        <TeamLink to={`/issues?team_id=${t.id}`} icon="issues">Issues</TeamLink>
                                        <TeamLink to={`/teams/${t.id}/cycles`} icon="cycles">Cycles</TeamLink>
                                        <TeamLink to={`/projects?team_id=${t.id}`} icon="projects">Projects</TeamLink>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {teams.length === 0 && <div style={{ padding: '4px 12px', fontSize: 13, color: 'var(--fg3)' }}>No teams yet.</div>}
                </div>
            )}
        </>
    );
}

interface NavProject { id: string; name: string; color: string }

/**
 * "My projects": your projects as the server lists them, by name. Nothing at all while you have none. With `plan`
 * (Today's bar) each one carries its initial and how many of today's issues are in it; without, a colour square.
 */
export function MyProjects({ projects, plan }: { projects: NavProject[]; plan?: PlanItem[] }) {
    const [open, toggle] = useFolded('prizy-nav-myprojects');
    if (projects.length === 0) return null;
    const byName = [...projects].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <>
            <GroupToggle icon="projects" label="My projects" open={open} onToggle={toggle} />
            {open && (
                <div role="group" aria-label="My projects" style={{ ...NAV_COLUMN, paddingLeft: 12 }}>
                    {byName.map((p) => {
                        const today = plan ? plan.filter(({ issue }) => issue.project?.id === p.id).length : 0;
                        return (
                            <Link key={p.id} to={`/projects/${p.id}`} className={ROW_HOVER} style={SUB_ROW}>
                                {plan ? <ProjectBadge name={p.name} color={p.color} size={22} square /> : <span aria-hidden="true" style={square(p.color)} />}
                                <span style={ONE_LINE}>{p.name}</span>
                                {today > 0 && (
                                    <span title="On today’s plan" style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg3)' }}>
                                        {today}<span className="sr-only"> on today’s plan</span>
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </>
    );
}
