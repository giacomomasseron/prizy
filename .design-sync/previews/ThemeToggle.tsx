import { Avatar, ThemeToggle } from '@prizy/ui';

export const Plain = () => <ThemeToggle />;

export const Outlined = () => <ThemeToggle variant="outlined" />;

export const SidebarFooter = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 260, padding: '10px 12px', background: 'var(--bg2)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)' }}>
        <Avatar initials="MC" color="#6d69f2" size={26} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Maya Chen</span>
        <ThemeToggle variant="outlined" />
    </div>
);
