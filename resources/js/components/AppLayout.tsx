import { useEffect, useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useRealtimeNotifications } from '../features/notifications/useRealtime';
import CommandPalette from '../features/search/CommandPalette';
import { useIssueDrawers } from '../features/issues/useIssueDrawers';
import { PeekDrawer } from '../features/issues/PeekDrawer';
import { CreateIssueDrawer } from '../features/issues/CreateIssueDrawer';
import { ProjectSidebar } from '../features/projects/ProjectSidebar';
import { GlobalSidebar } from './GlobalSidebar';

export default function AppLayout() {
    useRealtimeNotifications();
    const { peekId, createOpen, createStatus, openCreate, close } = useIssueDrawers();

    const [navHidden, setNavHidden] = useState<boolean>(() => {
        try { return localStorage.getItem('prizy-nav-hidden') === '1'; } catch { return false; }
    });
    function collapse() {
        setNavHidden((h) => {
            const next = !h;
            try { localStorage.setItem('prizy-nav-hidden', next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    }

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

    const projectMatch = useMatch('/projects/:id/*');

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }} className="bg-bg text-fg">
            {/* ── Sidebar ── */}
            {!navHidden && (
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
                    {projectMatch ? <ProjectSidebar projectId={projectMatch.params.id!} /> : <GlobalSidebar onCollapse={collapse} />}
                </aside>
            )}
            {navHidden && (
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
                        border: '1px solid var(--border)',
                        background: 'var(--panel)',
                        color: 'var(--fg2)',
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 16,
                    }}
                    className="hover:border-border2"
                >
                    ◧
                </button>
            )}

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
