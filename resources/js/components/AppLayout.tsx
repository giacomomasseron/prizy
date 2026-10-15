import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useRealtimeNotifications } from '../features/notifications/useRealtime';
import CommandPalette from '../features/search/CommandPalette';
import { useIssueDrawers } from '../features/issues/useIssueDrawers';
import { PeekDrawer } from '../features/issues/PeekDrawer';
import { CreateIssueDrawer } from '../features/issues/CreateIssueDrawer';
import { ProjectSidebar } from '../features/projects/ProjectSidebar';
import { HIDE_ID, TodaySidebar } from '../features/today/TodaySidebar';
import { GlobalSidebar } from './GlobalSidebar';
import { BrandMark } from './ui/BrandMark';
import { useFontScale } from '../lib/fontScale';
import { useMe } from '../auth/useAuth';
import { canDevelop as canDevelopFor } from '../auth/capabilities';

export default function AppLayout() {
    useRealtimeNotifications();
    const { peekId, createOpen, createStatus, openCreate, close } = useIssueDrawers();
    const { scale } = useFontScale();
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);

    const [navHidden, setNavHidden] = useState<boolean>(() => {
        try { return localStorage.getItem('prizy-nav-hidden') === '1'; } catch { return false; }
    });
    const collapse = useCallback(() => {
        setNavHidden((h) => {
            const next = !h;
            try { localStorage.setItem('prizy-nav-hidden', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    }, []);

    // C hotkey: open the create-issue drawer when not typing and no overlay is open
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key !== 'c' || e.metaKey || e.ctrlKey || e.altKey) return;
            if (!canDevelop) return; // non-developers can't create issues
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
    }, [peekId, createOpen, openCreate, canDevelop]);

    const projectMatch = useMatch('/projects/:id/*');
    // Today has its own left bar (the Today v2 design), with a Menu » pill when hidden and `[` to toggle it.
    const onToday = useMatch('/today') !== null;
    const pillRef = useRef<HTMLButtonElement>(null);
    // « hands the focus to the Menu pill, and the pill hands it back to «, so it never drops to the page.
    const focusAfter = useRef<'pill' | 'hide' | null>(null);
    useEffect(() => {
        const target = focusAfter.current;
        focusAfter.current = null;
        if (target === 'pill') pillRef.current?.focus();
        if (target === 'hide') document.getElementById(HIDE_ID)?.focus();
    }, [navHidden]);

    useEffect(() => {
        if (!onToday) return;
        function onKey(e: KeyboardEvent) {
            if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            const el = document.activeElement;
            const editable = el instanceof HTMLElement && (el.isContentEditable || (el.getAttribute('contenteditable') ?? 'false') !== 'false');
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || editable) return;
            // Not under an open overlay (the ⌘K palette, the peek or create drawer): the key belongs to it.
            const paletteOpen = !!document.querySelector('[role="dialog"][aria-label="Command palette"]');
            if (paletteOpen || peekId || createOpen) return;
            collapse();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onToday, collapse, peekId, createOpen]);

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }} className="bg-bg text-fg">
            {/* ── Sidebar ── */}
            {!navHidden && (
                <aside
                    aria-label="Sidebar"
                    style={{
                        width: 240,
                        flexShrink: 0,
                        background: 'var(--bg2)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        padding: onToday ? '18px 14px 14px' : '18px 8px 12px',
                        boxSizing: 'border-box',
                    }}
                >
                    {projectMatch ? <ProjectSidebar projectId={projectMatch.params.id!} />
                        : onToday ? <TodaySidebar onHide={() => { focusAfter.current = 'pill'; collapse(); }} />
                            : <GlobalSidebar onCollapse={collapse} />}
                </aside>
            )}
            {navHidden && onToday && (
                <button
                    ref={pillRef}
                    type="button"
                    aria-label="Menu, show sidebar"
                    title="Show sidebar ( [ )"
                    onClick={() => { focusAfter.current = 'hide'; collapse(); }}
                    className="border-border2 hover:border-fg"
                    style={{
                        position: 'absolute', top: 14, left: 14, zIndex: 40, display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '7px 14px 7px 8px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid',
                        background: 'var(--panel)', color: 'var(--fg)', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
                    }}
                >
                    <BrandMark size={24} />Menu »
                </button>
            )}
            {navHidden && !onToday && (
                <button
                    type="button"
                    aria-label="Expand sidebar"
                    title="Expand sidebar"
                    onClick={collapse}
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 40,
                        borderWidth: 'var(--line)',
                        borderStyle: 'solid',
                        background: 'var(--panel)',
                        color: 'var(--fg2)',
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: 16,
                    }}
                    className="border-border2 hover:border-fg"
                >
                    ◧
                </button>
            )}

            {/* ── Main content (zoom = user text-size preference from the toolbar).
                 --nav-inset lets page headers clear the floating Expand-sidebar button. ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg)', overflow: 'auto', zoom: scale, '--nav-inset': navHidden ? '48px' : '0px' } as CSSProperties}>
                <Outlet />
            </main>

            {/* Globally mounted — preserved from original AppLayout */}
            <CommandPalette />
            <PeekDrawer issueId={peekId} onClose={close} />
            <CreateIssueDrawer open={createOpen} initialStatus={createStatus} onClose={close} />
        </div>
    );
}
