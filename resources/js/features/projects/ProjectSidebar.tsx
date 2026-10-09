import { Link, NavLink } from 'react-router-dom';
import { useProject, useProjects, useMilestones } from './hooks';
import { useIssues } from '../issues/hooks';
import { SidebarFooter } from '../../components/SidebarFooter';
import { NAV_ROW_HOVER, countStyle, navRow, sectionLabel } from '../../components/sidebarStyles';
import { PROJECT_STATUS } from './projectStatus';
import { ProjectBadge } from './ProjectBadge';

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
            <Link
                to="/projects"
                className="border-border2 text-fg2 hover:border-fg hover:text-fg"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', margin: '0 6px 10px', padding: '6px 12px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
            >
                <span aria-hidden="true">←</span> All projects
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px 16px' }}>
                <ProjectBadge name={p?.name ?? ''} color={p?.color} size={36} />
                <div style={{ minWidth: 0 }}>
                    {/* A div, not a heading: the Overview h1 must be the only heading with the name. */}
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, letterSpacing: '-.02em', lineHeight: 1.15, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name ?? 'Loading…'}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg3)' }}>{p ? (PROJECT_STATUS[p.status]?.label ?? '') : ''}</div>
                </div>
            </div>

            <nav aria-label="Project" style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                    <Link key={other.id} to={`/projects/${other.id}`} aria-current={other.id === projectId ? 'page' : undefined} style={{ ...navRow(other.id === projectId), fontSize: 13.5 }} className={other.id === projectId ? '' : NAV_ROW_HOVER}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: other.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other.name}</span>
                    </Link>
                ))}
            </div>

            <SidebarFooter />
        </>
    );
}
