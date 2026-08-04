import { Link } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle';
import { UserMenu } from './UserMenu';

export function SidebarFooter() {
    return (
        <div style={{ marginTop: 'auto', padding: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <UserMenu variant="full" />
            <Link to="/settings" title="Settings" aria-label="Settings" style={{ color: 'var(--fg2)', width: 28, height: 28, borderRadius: 7, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} className="hover:bg-hover">⚙</Link>
            <ThemeToggle />
        </div>
    );
}
