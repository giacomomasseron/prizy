import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useActivities, useAddComment, useComments, useIssue, useIssueLabels, useSetIssueLabels, useUpdateIssue } from './hooks';
import { useLabels } from '../labels/hooks';
import { useProjects } from '../projects/hooks';
import { useCycles } from '../teams/hooks';

export default function IssueDetailPage() {
    const { id = '' } = useParams();
    const issue = useIssue(id);
    const comments = useComments(id);
    const activities = useActivities(id);
    const addComment = useAddComment(id);
    const [body, setBody] = useState('');

    const issueLabels = useIssueLabels(id);
    const allLabels = useLabels();
    const setLabels = useSetIssueLabels(id);
    const projects = useProjects();
    const cycles = useCycles(issue.data?.team_id ?? '');
    const updateIssue = useUpdateIssue(id);

    const selectedLabelIds = new Set((issueLabels.data?.items ?? []).map((l) => l.id));

    function toggleLabel(labelId: string) {
        const next = new Set(selectedLabelIds);
        if (next.has(labelId)) next.delete(labelId); else next.add(labelId);
        setLabels.mutate([...next]);
    }

    if (issue.isLoading) return <p className="p-6">Loading…</p>;
    if (issue.isError || !issue.data) return <p className="p-6">Not found.</p>;

    async function submitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!body.trim()) return;
        await addComment.mutateAsync(body);
        setBody('');
    }

    return (
        <div className="mx-auto max-w-3xl p-6">
            <Link to="/" className="text-sm text-indigo-600">← List</Link>
            <h1 className="mt-2 text-2xl font-semibold">{issue.data.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{issue.data.status} · {issue.data.priority}</p>
            {issue.data.description && <p className="mt-4 whitespace-pre-wrap">{issue.data.description}</p>}

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">Labels</h2>
                <ul className="space-y-1">
                    {allLabels.data?.items.map((l) => (
                        <li key={l.id}>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" aria-label={l.name} checked={selectedLabelIds.has(l.id)} onChange={() => toggleLabel(l.id)} />
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                                {l.name}
                            </label>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-6 flex flex-wrap gap-4">
                <label className="text-sm">Project{' '}
                    <select aria-label="Issue project" value={issue.data.project_id ?? ''} onChange={(e) => updateIssue.mutate({ project_id: e.target.value || null })} className="rounded border px-2 py-1">
                        <option value="">None</option>
                        {projects.data?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </label>
                <label className="text-sm">Cycle{' '}
                    <select aria-label="Issue cycle" value={issue.data.cycle_id ?? ''} onChange={(e) => updateIssue.mutate({ cycle_id: e.target.value || null })} className="rounded border px-2 py-1">
                        <option value="">None</option>
                        {cycles.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">Comments</h2>
                <ul className="space-y-2">
                    {comments.data?.items.map((c) => (
                        <li key={c.id} className="rounded border bg-white p-2 text-sm">{c.body}</li>
                    ))}
                </ul>
                <form onSubmit={submitComment} className="mt-3 flex gap-2">
                    <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…"
                        aria-label="Add a comment" className="flex-1 rounded border px-2 py-1" />
                    <button type="submit" className="rounded bg-indigo-600 px-3 text-white">Send</button>
                </form>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">Activity</h2>
                <ul className="space-y-1 text-sm text-gray-600">
                    {activities.data?.items.map((a) => (
                        <li key={a.id}>{a.type}{a.to_value ? `: ${a.to_value}` : ''}</li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
