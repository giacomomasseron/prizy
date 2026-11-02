import { Link } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';
import { UserMenu } from './UserMenu';

export function SidebarFooter() {
    return (
        <div style={{ marginTop: 'auto', padding: '12px 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserMenu variant="full" />
            <Link to="/settings" title="Settings" aria-label="Settings" style={{ color: 'var(--fg2)', width: 30, height: 30, borderRadius: '50%', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} className="hover:bg-hover">⚙</Link>
            <ThemeToggle />
        </div>
    );
}
