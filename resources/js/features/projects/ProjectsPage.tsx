import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import type { Project, ProjectStatus } from '../../lib/types';
import { useTeams } from '../teams/hooks';
import { useCreateProject, useDeleteProject, useProjects } from './hooks';

const STATUSES: ProjectStatus[] = ['planning', 'in_progress', 'paused', 'completed', 'cancelled'];

export default function ProjectsPage() {
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const projects = useProjects();
    const teams = useTeams();
    const create = useCreateProject();
    const del = useDeleteProject();
    const [name, setName] = useState('');
    const [status, setStatus] = useState<ProjectStatus>('planning');
    const [teamId, setTeamId] = useState('');
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim()) return;
        try {
            await create.mutateAsync({ name, status, team_id: teamId || null });
            setName(''); setStatus('planning'); setTeamId('');
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to create project.');
        }
    }

    async function remove(project: Project) {
        setError('');
        if (!window.confirm(`Delete project ${project.name}?`)) return;
        try { await del.mutateAsync(project.id); }
        catch (err) { setError(err instanceof ApiError ? err.detail : 'Failed to delete project.'); }
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <h1 className="mb-4 text-xl font-semibold">Projects</h1>

            {canDevelop && (
                <form onSubmit={submit} className="mb-4 flex flex-wrap gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name…"
                        aria-label="Project name" className="flex-1 rounded border border-border px-2 py-1" />
                    <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} aria-label="Project status" className="rounded border border-border px-2 py-1">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Project team" className="rounded border border-border px-2 py-1">
                        <option value="">No team</option>
                        {teams.data?.items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button type="submit" disabled={create.isPending} className="rounded bg-accent px-3 text-white disabled:opacity-50">Add project</button>
                </form>
            )}
            {error && <p className="mb-3 text-sm text-red">{error}</p>}

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
