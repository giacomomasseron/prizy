import { Link, NavLink } from 'react-router-dom';
import { useProject, useProjects, useMilestones } from './hooks';
import { useIssues } from '../issues/hooks';
import { SidebarFooter } from '../../components/SidebarFooter';
import type { CSSProperties } from 'react';

function subNavStyle(active: boolean): CSSProperties {
    return { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '6px 9px', borderRadius: 7, fontSize: 12.8, fontWeight: 500, textDecoration: 'none', color: active ? 'var(--fg)' : 'var(--fg2)', background: active ? 'var(--hover)' : 'transparent' };
}
const countStyle: CSSProperties = { fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' };

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
            <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '11px 10px 4px', padding: '6px 9px', color: 'var(--fg2)', fontSize: 12, borderRadius: 7, textDecoration: 'none' }} className="hover:bg-hover">
                <span style={{ fontSize: 14 }}>←</span> All projects
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 16px 14px' }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: p?.color ?? 'var(--border2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{(p?.name ?? '?').slice(0, 1).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name ?? 'Loading…'}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg3)' }}>Project</div>
                </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 12px 8px' }} />

            <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <NavLink end to={`/projects/${projectId}`} style={({ isActive }) => subNavStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'currentColor', opacity: 0.85 }} /></span><span style={{ flex: 1 }}>Overview</span>
                </NavLink>
                <NavLink to={`/projects/${projectId}/issues`} style={({ isActive }) => subNavStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, border: '1.6px solid currentColor' }} /></span><span style={{ flex: 1 }}>Issues</span><span style={countStyle}>{issueCount}</span>
                </NavLink>
                <NavLink to={`/projects/${projectId}/cycles`} style={({ isActive }) => subNavStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.6px solid currentColor' }} /></span><span style={{ flex: 1 }}>Cycles</span>
                </NavLink>
                <NavLink to={`/projects/${projectId}/roadmap`} style={({ isActive }) => subNavStyle(isActive)} className={({ isActive }) => (isActive ? '' : 'hover:bg-hover')}>
                    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center' }}><span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2.5, width: 12 }}><span style={{ width: 8, height: 2.5, borderRadius: 1, background: 'currentColor' }} /><span style={{ width: 12, height: 2.5, borderRadius: 1, background: 'currentColor' }} /><span style={{ width: 5, height: 2.5, borderRadius: 1, background: 'currentColor' }} /></span></span><span style={{ flex: 1 }}>Roadmap</span><span style={countStyle}>{msCount}</span>
                </NavLink>
            </nav>

            <div style={{ padding: '16px 18px 6px', fontSize: 10.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg3)' }}>Switch project</div>
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 1, overflow: 'auto' }}>
                {list.map((other) => (
                    <Link key={other.id} to={`/projects/${other.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 9px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, textDecoration: 'none', color: other.id === projectId ? 'var(--fg)' : 'var(--fg2)', background: other.id === projectId ? 'var(--hover)' : 'transparent' }} className={other.id === projectId ? '' : 'hover:bg-hover'}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: other.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other.name}</span>
                    </Link>
                ))}
            </div>

            <SidebarFooter />
        </>
    );
}
