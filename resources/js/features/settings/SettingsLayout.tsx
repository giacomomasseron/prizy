import type { CSSProperties, ReactElement } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMe } from '../../auth/useAuth';
import { canDevelop as canDevelopFor, canWorkHelpdesk } from '../../auth/capabilities';
import { useWorkspaceMembers } from '../members/workspaceHooks';
import { useTeams } from '../teams/hooks';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { BrandMark } from '../../components/ui/BrandMark';
import { NAV_ROW_HOVER, countStyle, navRow, sectionLabel } from '../../components/sidebarStyles';
import { emptyState } from '../projects/projectStyles';
import { pageFrame, pageTitle, pillBtn } from './settingsStyles';

// ─── decorative nav icons (mockup glyphs; empty and hidden from assistive tech) ──────

type IconKind = 'general' | 'members' | 'teams' | 'labels' | 'integrations' | 'hours' | 'sla' | 'billing' | 'audit';

const ICON_SLOT: CSSProperties = { width: 15, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 };
const ICONS: Record<Exclude<IconKind, 'audit'>, CSSProperties> = {
    general: { width: 12, height: 12, borderRadius: 3, border: '1.5px solid currentColor' },
    members: { width: 12, height: 12, borderRadius: '50%', border: '1.5px solid currentColor' },
    teams: { width: 12, height: 12, borderRadius: 3, background: 'currentColor', opacity: 0.85 },
    labels: { width: 11, height: 11, borderRadius: '50%', background: 'currentColor', opacity: 0.85 },
    integrations: { width: 12, height: 12, borderRadius: '50%', border: '1.5px dashed currentColor' },
    hours: {
        width: 12, height: 12, borderRadius: '50%', border: '1.5px solid currentColor',
        backgroundImage: 'linear-gradient(currentColor, currentColor)', backgroundRepeat: 'no-repeat',
        backgroundPosition: '50% 25%', backgroundSize: '1.5px 4px',
    },
    sla: { width: 12, height: 12, borderRadius: 3, border: '1.5px dashed currentColor' },
    billing: { width: 12, height: 9, borderRadius: 2, border: '1.5px solid currentColor' },
};
const AUDIT_BAR: CSSProperties = { height: 2, background: 'currentColor', borderRadius: 1 };

function NavIcon({ kind }: { kind: IconKind }) {
    return (
        <span style={ICON_SLOT} aria-hidden="true">
            {kind === 'audit' ? (
                <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2.5 }}>
                    <span style={{ ...AUDIT_BAR, width: 10 }} />
                    <span style={{ ...AUDIT_BAR, width: 7 }} />
                </span>
            ) : (
                <span style={{ display: 'inline-block', ...ICONS[kind] }} />
            )}
        </span>
    );
}

const disabledRow: CSSProperties = { ...navRow(false), opacity: 0.4, cursor: 'not-allowed' };

export const StubPage = ({ title }: { title: string }) => (
    <div style={pageFrame}>
        <h1 style={pageTitle}><span className="hl">{title}</span></h1>
        <div style={{ ...emptyState, marginTop: 22 }}>{title} — coming soon.</div>
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

    function navItem(to: string, label: string, icon: IconKind, count?: number) {
        return (
            <NavLink to={to} style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                <NavIcon kind={icon} />
                <span style={{ flex: 1 }}>{label}</span>
                {count !== undefined && <span style={countStyle}>{count}</span>}
            </NavLink>
        );
    }

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
                {/* Back to app — the left margin clears the floating Expand-sidebar button when the main sidebar is collapsed */}
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="border-border2 bg-transparent text-fg2 hover:border-fg hover:text-fg"
                    style={{ ...pillBtn, alignSelf: 'flex-start', margin: '14px 14px 10px calc(14px + var(--nav-inset, 0px))' }}
                >
                    ← Back to app
                </button>

                <div style={{ ...sectionLabel, padding: '8px 18px 6px' }}>Workspace settings</div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '2px 8px' }}>
                    {navItem('/settings/general', 'General', 'general')}
                    {canManage && navItem('/settings/members', 'Members', 'members', memberCount)}
                    {canManage && navItem('/settings/teams', 'Teams', 'teams', teamCount)}
                    {canDevelop && navItem('/settings/labels', 'Labels', 'labels')}
                    {canManage && navItem('/settings/integrations', 'Integrations', 'integrations')}
                    {isAgent && navItem('/settings/business-hours', 'Business hours', 'hours')}
                    {isAgent && navItem('/settings/sla-policies', 'SLA policies', 'sla')}
                    {/* Disabled stubs */}
                    <button type="button" disabled style={disabledRow}>
                        <NavIcon kind="billing" />
                        <span style={{ flex: 1 }}>Billing</span>
                    </button>
                    <button type="button" disabled style={disabledRow}>
                        <NavIcon kind="audit" />
                        <span style={{ flex: 1 }}>Audit log</span>
                    </button>
                </nav>

                {/* Footer: ink mark + workspace name + theme toggle */}
                <div
                    style={{
                        marginTop: 'auto',
                        borderTop: '1px solid var(--border)',
                        padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: 9,
                    }}
                >
                    <BrandMark size={22} />
                    {/* TODO: pull real workspace name once exposed here — Me type has no workspace_name field and AppLayout also hardcodes this literal */}
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>Prizy</span>
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
