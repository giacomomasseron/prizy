import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCreateIssue, useIssues } from './hooks';
import { useTeams } from '../teams/hooks';
import { FilterBar } from '../views/FilterBar';
import { paramsToFilters } from '../views/filters';

export default function IssueListPage() {
    const [searchParams] = useSearchParams();
    const { data, isLoading } = useIssues(paramsToFilters(searchParams));
    const createIssue = useCreateIssue();
    const teams = useTeams();
    const [title, setTitle] = useState('');
    const [teamId, setTeamId] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !teamId) return;
        await createIssue.mutateAsync({ team_id: teamId, title });
        setTitle('');
    }

    return (
        <>
        <FilterBar viewType="list" />
        <div className="mx-auto max-w-4xl p-6">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Issues</h1>
                <Link to="/board" className="text-sm text-accent">Board →</Link>
            </div>

            <form onSubmit={submit} className="mb-4 flex gap-2">
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Issue team" className="rounded border px-2 py-1">
                    <option value="">Team…</option>
                    {teams.data?.items.map((t) => <option key={t.id} value={t.id}>{t.identifier}</option>)}
                </select>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New issue title…"
                    aria-label="New issue title" className="flex-1 rounded border px-2 py-1" />
                <button type="submit" disabled={!teamId || createIssue.isPending}
                    className="rounded bg-accent px-3 text-white disabled:opacity-50">Add issue</button>
            </form>

            {isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border border-border bg-panel">
                {data?.items.map((issue) => (
                    <li key={issue.id} className="flex items-center justify-between px-4 py-2">
                        <Link to={`/issues/${issue.id}`} className="font-medium hover:underline">{issue.title}</Link>
                        <span className="text-xs text-fg2">{issue.status} · {issue.priority}</span>
                    </li>
                ))}
            </ul>
        </div>
        </>
    );
}
