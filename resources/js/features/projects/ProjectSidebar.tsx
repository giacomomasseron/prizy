import { Link, NavLink } from 'react-router-dom';
import { useProject, useProjects, useMilestones } from './hooks';
import { useIssues } from '../issues/hooks';
import { SidebarFooter } from '../../components/SidebarFooter';
import { NAV_ROW_HOVER, countStyle, navRow, sectionLabel } from '../../components/sidebarStyles';

export function ProjectSidebar({ projectId }: { projectId: string }) {
    const project = useProject(projectId);
    const projects = useProjects();
    const issuesQ = useIssues({ project_id: projectId });
    const milestones = useMilestones(projectId);
    const p = project.data;
    const issueCount = issuesQ.data?.items?.length ?? 0;
    const msCount = milestones.data?.items?.length ?? 0;
    const list = projects.data?.items ?? [];

    return (
        <>
            <Link to="/projects" style={{ ...navRow(false), margin: '0 0 6px', width: 'auto', fontSize: 13 }} className={NAV_ROW_HOVER}>
                <span style={{ fontSize: 14 }}>←</span> All projects
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 16px 14px' }}>
                <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-row)', background: p?.color ?? 'var(--border2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{(p?.name ?? '?').slice(0, 1).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name ?? 'Loading…'}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>Project</div>
                </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 12px 8px' }} />

            <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <NavLink end to={`/projects/${projectId}`} style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'currentColor', opacity: 0.85 }} /></span><span style={{ flex: 1 }}>Overview</span>
                </NavLink>
                <NavLink to={`/projects/${projectId}/issues`} style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, border: '1.6px solid currentColor' }} /></span><span style={{ flex: 1 }}>Issues</span><span style={countStyle}>{issueCount}</span>
                </NavLink>
                <NavLink to={`/projects/${projectId}/cycles`} style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.6px solid currentColor' }} /></span><span style={{ flex: 1 }}>Cycles</span>
                </NavLink>
                <NavLink to={`/projects/${projectId}/roadmap`} style={({ isActive }) => navRow(isActive)} className={({ isActive }) => (isActive ? '' : NAV_ROW_HOVER)}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2.5, width: 12 }}><span style={{ width: 8, height: 2.5, borderRadius: 1, background: 'currentColor' }} /><span style={{ width: 12, height: 2.5, borderRadius: 1, background: 'currentColor' }} /><span style={{ width: 5, height: 2.5, borderRadius: 1, background: 'currentColor' }} /></span></span><span style={{ flex: 1 }}>Roadmap</span><span style={countStyle}>{msCount}</span>
                </NavLink>
            </nav>

            <div style={{ ...sectionLabel, padding: '16px 18px 6px' }}>Switch project</div>
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
                {list.map((other) => (
                    <Link key={other.id} to={`/projects/${other.id}`} style={{ ...navRow(other.id === projectId), fontSize: 13.5 }} className={other.id === projectId ? '' : NAV_ROW_HOVER}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: other.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other.name}</span>
                    </Link>
                ))}
            </div>

            <SidebarFooter />
        </>
    );
}
