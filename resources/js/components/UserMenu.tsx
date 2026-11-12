import { useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../auth/useAuth';
import { Avatar } from './ui/Avatar';
import { Menu } from './ui/Menu';
import type { MenuItem } from './ui/Menu';

const USER_COLORS = ['#e0724a', '#4a7fe0', '#3a9a68', '#b06ae0', '#d0a23a', '#c96b8f', '#3aa8a0', '#6d69f2'];
function colorFromString(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return USER_COLORS[h % USER_COLORS.length];
}
function getInitials(name: string): string {
    return name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}

export interface UserMenuProps {
    /** The line under the name (Today v2's left bar shows your team). */
    subtitle?: string;
}

/**
 * The user account menu (Settings / Integrations / Logout): the account row at the foot of the left bars.
 * The issues toolbar used to carry an avatar-only form; the Workspace mockup dropped it (2026-11-11).
 */
export function UserMenu({ subtitle = 'Prizy workspace' }: UserMenuProps) {
    const me = useMe();
    const logout = useLogout();
    const navigate = useNavigate();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const userName = me.data?.name ?? '';
    const initials = userName ? getInitials(userName) : '';
    const avatarColor = me.data?.id ? colorFromString(me.data.id) : 'var(--accent)';

    const items: MenuItem[] = [
        { key: 'settings', label: 'Settings', onActivate: () => navigate('/settings') },
        ...(canManage ? [{ key: 'integrations', label: 'Integrations', onActivate: () => navigate('/settings/integrations') }] : []),
        { key: 'logout', label: 'Logout', onActivate: () => logout.mutate(), danger: true },
    ];

    const avatar = (
        <Avatar initials={initials || undefined} color={initials ? avatarColor : undefined} size={34} title={userName || 'Me'} />
    );

    // fullWidth: the account block takes the row's free width, so what follows it sits at the right edge.
    return (
        <Menu
            placement="top-start"
            fullWidth
            trigger={
                <button
                    type="button"
                    data-testid="user-menu-trigger"
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
                        border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-row)',
                        padding: '4px 6px', fontFamily: 'inherit', textAlign: 'left',
                    }}
                    className="bg-transparent hover:bg-hover"
                >
                    {avatar}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || 'Loading…'}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--fg3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
                    </div>
                </button>
            }
            items={items}
        />
    );
}
