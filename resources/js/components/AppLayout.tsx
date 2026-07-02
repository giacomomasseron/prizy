import { NavLink, Outlet } from 'react-router-dom';
import { useLogout } from '../auth/useAuth';
import { NotificationBell } from '../features/notifications/NotificationBell';

const links: Array<{ to: string; label: string }> = [
    { to: '/', label: 'Issues' },
    { to: '/board', label: 'Board' },
    { to: '/teams', label: 'Teams' },
    { to: '/projects', label: 'Projects' },
    { to: '/roadmap', label: 'Roadmap' },
    { to: '/labels', label: 'Labels' },
];

export default function AppLayout() {
    const logout = useLogout();

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="border-b bg-white">
                <nav className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 text-sm">
                    <span className="font-semibold">Prizy</span>
                    {links.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === '/'}
                            className={({ isActive }) =>
                                isActive ? 'text-indigo-600 font-medium' : 'text-gray-600 hover:text-gray-900'
                            }
                        >
                            {l.label}
                        </NavLink>
                    ))}
                    <div className="ml-auto flex items-center gap-3">
                        <NotificationBell />
                        <button type="button" onClick={() => logout.mutate()} className="text-gray-500 hover:text-gray-900">Logout</button>
                    </div>
                </nav>
            </header>
            <main>
                <Outlet />
            </main>
        </div>
    );
}
