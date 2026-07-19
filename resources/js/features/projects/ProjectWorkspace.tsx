import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useProject } from './hooks';

function viewLabel(pathname: string): string {
    if (pathname.endsWith('/issues')) return 'Issues';
    if (pathname.endsWith('/cycles')) return 'Cycles';
    if (pathname.endsWith('/roadmap')) return 'Roadmap';
    return 'Overview';
}

export default function ProjectWorkspace() {
    const { id = '' } = useParams();
    const project = useProject(id);
    const location = useLocation();
    const p = project.data;

    if (project.isLoading) return <p style={{ padding: 30 }}>Loading…</p>;
    if (!p) return <p style={{ padding: 30, color: 'var(--fg2)' }}>Project not found.</p>;

    return (
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 34px 80px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 12.5 }}>
                <Link to="/projects" style={{ color: 'var(--fg2)', textDecoration: 'none' }}>Projects</Link>
                <span style={{ color: 'var(--fg3)' }}>/</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--fg)', fontWeight: 500 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />{p.name}
                </span>
                <span style={{ color: 'var(--fg3)' }}>/</span>
                <span style={{ color: 'var(--fg2)' }}>{viewLabel(location.pathname)}</span>
            </div>
            <Outlet />
        </div>
    );
}
