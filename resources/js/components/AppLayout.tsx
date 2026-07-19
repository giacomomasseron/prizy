import { useEffect } from 'react';
import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { useUnreadCount } from '../features/notifications/hooks';
import { useRealtimeNotifications } from '../features/notifications/useRealtime';
import CommandPalette from '../features/search/CommandPalette';
import { useIssueDrawers } from '../features/issues/useIssueDrawers';
import { useIssues } from '../features/issues/hooks';
import { PeekDrawer } from '../features/issues/PeekDrawer';
import { CreateIssueDrawer } from '../features/issues/CreateIssueDrawer';
import { Kbd } from './ui/Kbd';
import { SidebarFooter } from './SidebarFooter';
import { ProjectSidebar } from '../features/projects/ProjectSidebar';

// Nav item row style — mirroring the mockup navCss helper
function navItemStyle(active: boolean): React.CSSProperties {
    return {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '6px 9px',
        borderRadius: 7,
        fontSize: 12.8,
        fontWeight: 500,
        textDecoration: 'none',
        color: active ? 'var(--fg)' : 'var(--fg2)',
        background: active ? 'var(--hover)' : 'transparent',
    };
}

// Icons — CSS-drawn inline, no extra dep
function IssuesIcon() {
    return (
        <span
            style={{ width: 13, height: 13, borderRadius: 3, border: '1.6px solid currentColor', display: 'inline-block', flexShrink: 0 }}
        />
    );
}
function ProjectsIcon() {
    return (
        <span
            style={{ width: 13, height: 13, borderRadius: 3, background: 'currentColor', opacity: 0.85, display: 'inline-block', flexShrink: 0 }}
        />
    );
}
function RoadmapIcon() {
    return (
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2.5, width: 13, flexShrink: 0 }}>
            <span style={{ width: 8, height: 2.5, borderRadius: 1, background: 'currentColor' }} />
            <span style={{ width: 13, height: 2.5, borderRadius: 1, background: 'currentColor' }} />
            <span style={{ width: 5, height: 2.5, borderRadius: 1, background: 'currentColor' }} />
        </span>
    );
}
function TeamsIcon() {
    return (
        <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', width: 13, flexShrink: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.4px solid currentColor', display: 'inline-block' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', border: '1.4px solid currentColor', display: 'inline-block', opacity: 0.7 }} />
        </span>
    );
}

function SearchNavIcon() {
    return (
        <span style={{ width: 13, height: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, lineHeight: 1 }}>
            ⌕
        </span>
    );
}
function InboxIcon() {
    return (
        <span style={{ width: 13, height: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span
                style={{
                    width: 12,
                    height: 10,
                    borderRadius: 2,
                    border: '1.5px solid currentColor',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 1,
                }}
            >
                <span style={{ width: 6, height: 3, borderRadius: '0 0 2px 2px', background: 'currentColor' }} />
            </span>
        </span>
    );
}

const NAV_LINKS = [
    { to: '/', label: 'Issues', icon: <IssuesIcon />, end: true },
    { to: '/projects', label: 'Projects', icon: <ProjectsIcon />, end: false },
    { to: '/roadmap', label: 'Roadmap', icon: <RoadmapIcon />, end: false },
    { to: '/teams', label: 'Teams', icon: <TeamsIcon />, end: false },
    { to: '/search', label: 'Search', icon: <SearchNavIcon />, end: false },
] as const;

export default function AppLayout() {
    const unread = useUnreadCount();
    const unreadCount = unread.data?.count ?? 0;
    useRealtimeNotifications();
    const { peekId, createOpen, createStatus, openCreate, close } = useIssueDrawers();
    const { data: issuesData } = useIssues();
    const activeIssueCount = (issuesData?.items ?? []).filter(
        (i) => i.status !== 'done' && i.status !== 'cancelled',
    ).length;

    // C hotkey: open the create-issue drawer when not typing and no overlay is open
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
            const el = document.activeElement;
            const inInput =
                el instanceof HTMLInputElement ||
                el instanceof HTMLTextAreaElement ||
                el?.getAttribute('contenteditable') === 'true';
            const paletteOpen = !!document.querySelector('[role="dialog"][aria-label="Command palette"]');
            if (!inInput && !paletteOpen && !peekId && !createOpen) {
                openCreate();
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [peekId, createOpen, openCreate]);

    function openSearch() {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
    }

    const projectMatch = useMatch('/projects/:id/*');

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }} className="bg-bg text-fg">
            {/* ── Sidebar ── */}
            <aside
                style={{
                    width: 238,
                    flexShrink: 0,
                    background: 'var(--bg2)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {projectMatch ? (
                    <ProjectSidebar projectId={projectMatch.params.id!} />
                ) : (
                    <>
                {/* 1. Workspace header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 12px 11px' }}>
                    <div
                        style={{
                            width: 23,
                            height: 23,
                            borderRadius: 6,
                            background: 'var(--accent)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        P
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-.01em' }}>Prizy</span>
                    <span style={{ color: 'var(--fg3)', fontSize: 10, marginTop: 2 }}>▾</span>
                    <button
                        type="button"
                        title="Search (⌘K)"
                        aria-label="Search"
                        onClick={openSearch}
                        style={{
                            marginLeft: 'auto',
                            border: 'none',
                            background: 'none',
                            color: 'var(--fg2)',
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            cursor: 'pointer',
                            fontSize: 15,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                        className="hover:bg-hover"
                    >
                        ⌕
                    </button>
                </div>

                {/* 2. New issue button */}
                <div style={{ padding: '0 10px 10px' }}>
                    <button
                        type="button"
                        onClick={() => openCreate()}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            padding: '7px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--panel)',
                            color: 'var(--fg)',
                            fontSize: 12.5,
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                        className="hover:border-border2"
                    >
                        <span
                            style={{
                                width: 16,
                                height: 16,
                                borderRadius: 5,
                                background: 'var(--accent)',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                flexShrink: 0,
                            }}
                        >
                            +
                        </span>
                        New issue
                        <span style={{ marginLeft: 'auto' }}>
                            <Kbd>C</Kbd>
                        </span>
                    </button>
                </div>

                {/* 3. Primary nav */}
                <nav style={{ padding: '2px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {NAV_LINKS.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            style={({ isActive }) => navItemStyle(isActive)}
                            className={({ isActive }) => isActive ? '' : 'hover:bg-hover'}
                        >
                            <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
                                {link.icon}
                            </span>
                            <span style={{ flex: 1 }}>{link.label}</span>
                            {link.to === '/' && activeIssueCount > 0 && (
                                <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                                    {activeIssueCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* 4. Divider */}
                <div style={{ margin: '8px 0', borderTop: '1px solid var(--border)' }} />

                {/* 5. Inbox */}
                <div style={{ padding: '0 8px' }}>
                    <NavLink
                        to="/notifications"
                        style={({ isActive }) => navItemStyle(isActive)}
                        className={({ isActive }) => isActive ? '' : 'hover:bg-hover'}
                        aria-label="Inbox"
                    >
                        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}>
                            <InboxIcon />
                        </span>
                        <span style={{ flex: 1 }}>Inbox</span>
                        {unreadCount > 0 && (
                            <span
                                data-testid="inbox-badge"
                                style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--accent)',
                                    background: 'var(--accent2)',
                                    borderRadius: 20,
                                    padding: '1px 7px',
                                    flexShrink: 0,
                                }}
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </NavLink>
                </div>

                {/* 6. User footer */}
                <SidebarFooter />
                    </>
                )}
            </aside>

            {/* ── Main content ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)', overflow: 'auto' }}>
                <Outlet />
            </main>

            {/* Globally mounted — preserved from original AppLayout */}
            <CommandPalette />
            <PeekDrawer issueId={peekId} onClose={close} />
            <CreateIssueDrawer open={createOpen} initialStatus={createStatus} onClose={close} />
        </div>
    );
}
