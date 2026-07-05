import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import type { Project } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { useDeleteProject, useProjects } from './hooks';

export default function ProjectsPage() {
    const navigate = useNavigate();
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const projects = useProjects();
    const del = useDeleteProject();

    async function remove(project: Project) {
        if (!window.confirm(`Delete project ${project.name}?`)) return;
        try { await del.mutateAsync(project.id); }
        catch (err) { window.alert(err instanceof ApiError ? err.detail : 'Failed to delete project.'); }
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h1 className="text-xl font-semibold">Projects</h1>
                {canDevelop && (
                    <Button onClick={() => navigate('/create?tab=project')}>New project</Button>
                )}
            </div>

            {projects.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {projects.data?.items.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-4 py-2">
                        <Link to={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                        <span className="flex items-center gap-3">
                            <span className="text-xs text-fg2">{p.status}</span>
                            {canDevelop && <button type="button" onClick={() => remove(p)} className="text-sm text-red hover:underline">Delete</button>}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
