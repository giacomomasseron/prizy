import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import { useCreateMilestone, useDeleteMilestone, useMilestones, useProjects } from './hooks';

export default function ProjectDetailPage() {
    const { id = '' } = useParams();
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const projects = useProjects();
    const milestones = useMilestones(id);
    const create = useCreateMilestone(id);
    const del = useDeleteMilestone(id);
    const [name, setName] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [error, setError] = useState('');

    const project = projects.data?.items.find((p) => p.id === id);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim() || !targetDate) return;
        try {
            await create.mutateAsync({ name, target_date: targetDate });
            setName(''); setTargetDate('');
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to create milestone.');
        }
    }

    return (
        <div className="mx-auto max-w-3xl p-6">
            <Link to="/projects" className="text-sm text-accent">← Projects</Link>
            <h1 className="mt-2 text-xl font-semibold">{project?.name ?? 'Project'}</h1>

            <h2 className="mt-6 mb-2 font-semibold">Milestones</h2>
            {canDevelop && (
                <form onSubmit={submit} className="mb-3 flex flex-wrap gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Milestone name…"
                        aria-label="Milestone name" className="flex-1 rounded border border-border px-2 py-1" />
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-label="Milestone target date" className="rounded border border-border px-2 py-1" />
                    <button type="submit" disabled={create.isPending} className="rounded bg-accent px-3 text-white disabled:opacity-50">Add milestone</button>
                </form>
            )}
            {error && <p className="mb-3 text-sm text-red">{error}</p>}

            {milestones.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {milestones.data?.items.map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-4 py-2">
                        <span>{m.name} <span className="text-xs text-fg2">{m.target_date}</span></span>
                        {canDevelop && <button type="button" onClick={() => { if (window.confirm(`Delete ${m.name}?`)) del.mutate(m.id); }} className="text-sm text-red hover:underline">Delete</button>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
