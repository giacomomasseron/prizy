import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import { useCreateCycle, useCycles, useDeleteCycle, useTeams } from './hooks';

export default function TeamDetailPage() {
    const { id = '' } = useParams();
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const teams = useTeams();
    const cycles = useCycles(id);
    const create = useCreateCycle(id);
    const del = useDeleteCycle(id);
    const [name, setName] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [error, setError] = useState('');

    const team = teams.data?.items.find((t) => t.id === id);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim() || !startsAt || !endsAt) return;
        try {
            await create.mutateAsync({ name, starts_at: startsAt, ends_at: endsAt });
            setName(''); setStartsAt(''); setEndsAt('');
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to create cycle.');
        }
    }

    return (
        <div className="mx-auto max-w-3xl p-6">
            <Link to="/teams" className="text-sm text-accent">← Teams</Link>
            <h1 className="mt-2 text-xl font-semibold">{team ? `${team.identifier} · ${team.name}` : 'Team'}</h1>

            <h2 className="mt-6 mb-2 font-semibold">Cycles</h2>
            {canDevelop && (
                <form onSubmit={submit} className="mb-3 flex flex-wrap gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cycle name…"
                        aria-label="Cycle name" className="flex-1 rounded border border-border px-2 py-1" />
                    <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} aria-label="Cycle start" className="rounded border border-border px-2 py-1" />
                    <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} aria-label="Cycle end" className="rounded border border-border px-2 py-1" />
                    <button type="submit" disabled={create.isPending} className="rounded bg-accent px-3 text-white disabled:opacity-50">Add cycle</button>
                </form>
            )}
            {error && <p className="mb-3 text-sm text-red">{error}</p>}

            {cycles.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {cycles.data?.items.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2">
                        <span>{c.name} <span className="text-xs text-fg2">{c.starts_at} → {c.ends_at}</span></span>
                        {canDevelop && (
                            <button type="button" onClick={() => { if (window.confirm(`Delete ${c.name}?`)) del.mutate(c.id); }} className="text-sm text-red hover:underline">Delete</button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
