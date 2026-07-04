import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import type { Team } from '../../lib/types';
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from './hooks';

export default function TeamsPage() {
    const me = useMe();
    const canManage = ['owner', 'admin'].includes(me.data?.admin_level ?? '');
    const teams = useTeams();
    const create = useCreateTeam();
    const del = useDeleteTeam();
    const [name, setName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim() || !identifier.trim()) return;
        try {
            await create.mutateAsync({ name, identifier });
            setName('');
            setIdentifier('');
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to create team.');
        }
    }

    async function remove(team: Team) {
        setError('');
        if (!window.confirm(`Delete team ${team.name}?`)) return;
        try {
            await del.mutateAsync(team.id);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to delete team.');
        }
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <h1 className="mb-4 text-xl font-semibold">Teams</h1>

            {canManage && (
                <form onSubmit={submit} className="mb-4 flex flex-wrap gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name…"
                        aria-label="Team name" className="flex-1 rounded border px-2 py-1" />
                    <input value={identifier} onChange={(e) => setIdentifier(e.target.value.toUpperCase())} placeholder="ID (e.g. ENG)"
                        aria-label="Team identifier" maxLength={8} className="w-32 rounded border px-2 py-1" />
                    <button type="submit" disabled={create.isPending}
                        className="rounded bg-accent px-3 text-white disabled:opacity-50">Add team</button>
                </form>
            )}
            {error && <p className="mb-3 text-sm text-red">{error}</p>}

            {teams.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {teams.data?.items.map((team) => (
                    <li key={team.id} className="flex items-center justify-between px-4 py-2">
                        <Link to={`/teams/${team.id}`} className="font-medium hover:underline">
                            <span className="mr-2 rounded bg-hover px-1.5 py-0.5 text-xs">{team.identifier}</span>
                            {team.name}
                        </Link>
                        {canManage && (
                            <button type="button" onClick={() => remove(team)} className="text-sm text-red hover:underline">Delete</button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
