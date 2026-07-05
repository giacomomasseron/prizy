import type { CSSProperties, ReactElement } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { useWorkspaceMembers } from '../members/workspaceHooks';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

const navBtn = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '6px 9px', borderRadius: 7,
    fontSize: 12.8, fontWeight: 500,
    color: active ? 'var(--fg)' : 'var(--fg2)',
    background: active ? 'var(--hover)' : 'transparent',
    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
});

export const StubPage = ({ title }: { title: string }) => (
    <div style={{ padding: 40 }}>
        <p style={{ color: 'var(--fg3)' }}>{title} — coming soon.</p>
    </div>
);

export function RequireManage({ children }: { children: ReactElement }) {
    const me = useMe();
    if (me.isLoading) return null;
    if (!['owner', 'admin'].includes(me.data?.admin_level ?? '')) {
        return <Navigate to="/settings/general" replace />;
    }
    return children;
}

export default function SettingsLayout() {
    const me = useMe();
    const navigate = useNavigate();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const members = useWorkspaceMembers({ enabled: canManage });
    const memberCount = members.data?.length;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--fg)' }}>
            {/* Left sidebar */}
            <div
                style={{
                    width: 240, flexShrink: 0,
                    background: 'var(--bg2)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Back to app */}
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '14px 12px',
                        fontSize: 12.5, color: 'var(--fg2)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left',
                    }}
                >
                    ← Back to app
                </button>

                {/* Section header */}
                <div
                    style={{
                        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--fg3)', padding: '6px 12px 4px', letterSpacing: '0.05em',
                    }}
                >
                    Workspace settings
                </div>

                {/* Nav items */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px' }}>
                    {canManage && (
                        <NavLink
                            to="/settings/members"
                            style={({ isActive }) => navBtn(isActive)}
                        >
                            Members
                            {memberCount !== undefined && (
                                <span
                                    style={{
                                        marginLeft: 'auto', fontSize: 11,
                                        color: 'var(--fg3)', fontFamily: 'var(--font-mono)',
                                    }}
                                >
                                    {memberCount}
                                </span>
                            )}
                        </NavLink>
                    )}
                    <NavLink
                        to="/settings/general"
                        style={({ isActive }) => navBtn(isActive)}
                    >
                        General
                    </NavLink>
                    {/* Integrations — navigate to existing /integrations page */}
                    <a
                        href="/integrations"
                        style={navBtn(false)}
                    >
                        Integrations
                    </a>
                    {/* Disabled stubs */}
                    <button
                        type="button"
                        disabled
                        style={{ ...navBtn(false), opacity: 0.4, cursor: 'not-allowed' }}
                    >
                        Billing
                    </button>
                    <button
                        type="button"
                        disabled
                        style={{ ...navBtn(false), opacity: 0.4, cursor: 'not-allowed' }}
                    >
                        Audit log
                    </button>
                </nav>

                {/* Footer: workspace monogram + name + theme toggle */}
                <div
                    style={{
                        marginTop: 'auto',
                        borderTop: '1px solid var(--border)',
                        padding: 10,
                        display: 'flex', alignItems: 'center', gap: 9,
                    }}
                >
                    <div
                        style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: 'var(--accent)', color: '#fff',
                            fontWeight: 700, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        P
                    </div>
                    <span style={{ fontSize: 13, flex: 1 }}>Prizy</span>
                    <ThemeToggle />
                </div>
            </div>

            {/* Right content area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Outlet />
            </div>
        </div>
    );
}
