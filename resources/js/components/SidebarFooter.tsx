import { useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../auth/useAuth';
import { Avatar } from './ui/Avatar';
import { Menu } from './ui/Menu';
import type { MenuItem } from './ui/Menu';
import { ThemeToggle } from './ui/ThemeToggle';

const USER_COLORS = ['#e0724a', '#4a7fe0', '#3a9a68', '#b06ae0', '#d0a23a', '#c96b8f', '#3aa8a0', '#6d69f2'];
function colorFromString(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return USER_COLORS[h % USER_COLORS.length];
}
function getInitials(name: string): string {
    return name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}

export function SidebarFooter() {
    const me = useMe();
    const logout = useLogout();
    const navigate = useNavigate();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const userName = me.data?.name ?? '';
    const initials = userName ? getInitials(userName) : '';
    const avatarColor = me.data?.id ? colorFromString(me.data.id) : 'var(--accent)';

    const userMenuItems: MenuItem[] = [
        { key: 'settings', label: 'Settings', onActivate: () => navigate('/settings') },
        ...(canManage ? [{ key: 'integrations', label: 'Integrations', onActivate: () => navigate('/settings/integrations') }] : []),
        { key: 'logout', label: 'Logout', onActivate: () => logout.mutate(), danger: true },
    ];

    return (
        <div style={{ marginTop: 'auto', padding: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Menu
                placement="top-start"
                trigger={
                    <button type="button" data-testid="user-menu-trigger"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 7, padding: '3px 4px', fontFamily: 'inherit', textAlign: 'left' }}
                        className="hover:bg-hover">
                        <Avatar initials={initials || undefined} color={initials ? avatarColor : undefined} size={26} title={userName || 'Me'} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || 'Loading…'}</div>
                            <div style={{ fontSize: 11, color: 'var(--fg3)' }}>Prizy workspace</div>
                        </div>
                    </button>
                }
                items={userMenuItems}
            />
            <ThemeToggle />
        </div>
    );
}
