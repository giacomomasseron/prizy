import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useProject } from './hooks';

function viewLabel(pathname: string): string {
    if (pathname.endsWith('/issues')) return 'Issues';
    if (pathname.endsWith('/cycles')) return 'Cycles';
    if (pathname.endsWith('/roadmap')) return 'Roadmap';
    return 'Overview';
}

const sep: React.CSSProperties = { color: 'var(--border2)', fontWeight: 700 };

export default function ProjectWorkspace() {
    const { id = '' } = useParams();
    const project = useProject(id);
    const location = useLocation();
    const p = project.data;

    if (project.isLoading) return <p style={{ margin: 0, padding: '24px 34px', fontSize: 15, color: 'var(--fg3)' }}>Loading…</p>;
    if (!p) return <p style={{ margin: 0, padding: '24px 34px', fontSize: 15, color: 'var(--fg2)' }}>Project not found.</p>;

    return (
        <>
            {/* Top bar: breadcrumb (never headings). The left padding clears the floating
                Expand-sidebar button when the sidebar is collapsed (--nav-inset on <main>). */}
            <div style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 34px 0 calc(34px + var(--nav-inset, 0px))' }}>
                <Link to="/projects" className="text-fg2 hover:text-fg hover:bg-hover" style={{ fontSize: 14, fontWeight: 600, padding: '5px 10px', borderRadius: 'var(--radius-pill)', textDecoration: 'none' }}>
                    Projects
                </Link>
                <span aria-hidden="true" style={sep}>/</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap', minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />{p.name}
                </span>
                <span aria-hidden="true" style={sep}>/</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg2)', whiteSpace: 'nowrap' }}>{viewLabel(location.pathname)}</span>
            </div>
            {/* Left-aligned with the bar (no auto margins). */}
            <div style={{ maxWidth: 1120, width: '100%', boxSizing: 'border-box', padding: '22px 34px 80px' }}>
                <Outlet />
            </div>
        </>
    );
}
