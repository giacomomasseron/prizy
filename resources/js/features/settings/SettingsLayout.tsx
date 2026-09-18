import type { CSSProperties, ReactElement } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor, canWorkHelpdesk } from '../../auth/capabilities';
import { useWorkspaceMembers } from '../members/workspaceHooks';
import { useTeams } from '../teams/hooks';
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
    const canDevelop = canDevelopFor(me.data);
    // Both rows link to pages a workspace with the module switched off answers 404 on.
    const isAgent = canWorkHelpdesk(me.data);
    const members = useWorkspaceMembers({ enabled: canManage });
    const memberCount = members.data?.length;
    const teams = useTeams({ enabled: canManage });
    const teamCount = teams.data?.items.length;

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
                    {canManage && (
                        <NavLink to="/settings/teams" style={({ isActive }) => navBtn(isActive)}>
                            Teams
                            {teamCount !== undefined && (
                                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                                    {teamCount}
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
                    {canDevelop && (
                        <NavLink to="/settings/labels" style={({ isActive }) => navBtn(isActive)}>
                            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'currentColor', opacity: 0.85 }} />
                            Labels
                        </NavLink>
                    )}
                    {canManage && (
                        <NavLink to="/settings/integrations" style={({ isActive }) => navBtn(isActive)}>
                            Integrations
                        </NavLink>
                    )}
                    {isAgent && (
                        <NavLink to="/settings/business-hours" style={({ isActive }) => navBtn(isActive)}>
                            Business hours
                        </NavLink>
                    )}
                    {isAgent && (
                        <NavLink to="/settings/sla-policies" style={({ isActive }) => navBtn(isActive)}>
                            SLA policies
                        </NavLink>
                    )}
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
                    {/* TODO: pull real workspace name once exposed here — Me type has no workspace_name field and AppLayout also hardcodes this literal */}
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
