import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useActivities, useAddComment, useComments, useIssue, useIssueLabels, useSetIssueLabels, useUpdateIssue } from './hooks';
import { useGithubLinks, useAddGithubLink, useRemoveGithubLink } from './githubLinks';
import { useLabels } from '../labels/hooks';
import { useProjects } from '../projects/hooks';
import { useCycles } from '../teams/hooks';
import { useMe } from '../../auth/useAuth';
import { ApiError } from '../../lib/apiClient';

export default function IssueDetailPage() {
    const { id = '' } = useParams();
    const issue = useIssue(id);
    const comments = useComments(id);
    const activities = useActivities(id);
    const addComment = useAddComment(id);
    const [body, setBody] = useState('');
    const [error, setError] = useState('');

    const me = useMe();
    const issueLabels = useIssueLabels(id);
    const allLabels = useLabels();
    const setLabels = useSetIssueLabels(id);
    const projects = useProjects();
    const cycles = useCycles(issue.data?.team_id ?? '');
    const updateIssue = useUpdateIssue(id);

    const githubLinks = useGithubLinks(id);
    const addGithubLink = useAddGithubLink(id);
    const removeGithubLink = useRemoveGithubLink(id);
    const [prUrl, setPrUrl] = useState('');
    const [prError, setPrError] = useState('');

    async function onAddPr() {
        setPrError('');
        try {
            await addGithubLink.mutateAsync(prUrl);
            setPrUrl('');
        } catch (err) {
            setPrError(err instanceof ApiError ? err.detail : 'Failed to add.');
        }
    }

    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const selectedLabelIds = new Set((issueLabels.data?.items ?? []).map((l) => l.id));

    async function toggleLabel(labelId: string) {
        setError('');
        const next = new Set(selectedLabelIds);
        if (next.has(labelId)) next.delete(labelId); else next.add(labelId);
        try {
            await setLabels.mutateAsync([...next]);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Update failed.');
        }
    }

    if (issue.isLoading) return <p className="p-6">Loading…</p>;
    if (issue.isError || !issue.data) return <p className="p-6">Not found.</p>;

    async function submitComment(e: React.FormEvent) {
        e.preventDefault();
        if (!body.trim()) return;
        await addComment.mutateAsync(body);
        setBody('');
    }

    const currentProject = projects.data?.items.find((p) => p.id === issue.data!.project_id);
    const currentCycle = cycles.data?.items.find((c) => c.id === issue.data!.cycle_id);

    return (
        <div className="mx-auto max-w-3xl p-6">
            <Link to="/" className="text-sm text-accent">← List</Link>
            <h1 className="mt-2 text-2xl font-semibold">{issue.data.title}</h1>
            <p className="mt-1 text-sm text-fg2">{issue.data.status} · {issue.data.priority}</p>
            {issue.data.description && <p className="mt-4 whitespace-pre-wrap">{issue.data.description}</p>}

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">Labels</h2>
                {canDevelop ? (
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
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {(issueLabels.data?.items ?? []).map((l) => (
                            <li key={l.id} className="flex items-center gap-1 rounded bg-hover px-2 py-0.5 text-sm">
                                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                                {l.name}
                            </li>
                        ))}
                        {(issueLabels.data?.items ?? []).length === 0 && <li className="text-sm text-fg3">None</li>}
                    </ul>
                )}
                {error && <p className="mt-2 text-sm text-red">{error}</p>}
            </section>

            <section className="mt-6 flex flex-wrap gap-4">
                {canDevelop ? (
                    <>
                        <label className="text-sm">Project{' '}
                            <select
                                aria-label="Issue project"
                                value={issue.data.project_id ?? ''}
                                onChange={async (e) => {
                                    setError('');
                                    try {
                                        await updateIssue.mutateAsync({ project_id: e.target.value || null });
                                    } catch (err) {
                                        setError(err instanceof ApiError ? err.detail : 'Update failed.');
                                    }
                                }}
                                className="rounded border px-2 py-1"
                            >
                                <option value="">None</option>
                                {projects.data?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </label>
                        <label className="text-sm">Cycle{' '}
                            <select
                                aria-label="Issue cycle"
                                value={issue.data.cycle_id ?? ''}
                                onChange={async (e) => {
                                    setError('');
                                    try {
                                        await updateIssue.mutateAsync({ cycle_id: e.target.value || null });
                                    } catch (err) {
                                        setError(err instanceof ApiError ? err.detail : 'Update failed.');
                                    }
                                }}
                                className="rounded border px-2 py-1"
                            >
                                <option value="">None</option>
                                {cycles.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </label>
                    </>
                ) : (
                    <>
                        <span className="text-sm">Project: <span className="font-medium">{currentProject?.name ?? 'None'}</span></span>
                        <span className="text-sm">Cycle: <span className="font-medium">{currentCycle?.name ?? 'None'}</span></span>
                    </>
                )}
            </section>

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">GitHub</h2>
                <ul className="space-y-1 text-sm">
                    {githubLinks.data?.map((l) => (
                        <li key={l.id} className="flex items-center gap-2">
                            <a href={l.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{l.repo} #{l.number}</a>
                            <span className="rounded bg-hover px-1.5 py-0.5 text-xs text-fg2">{l.state}</span>
                            {canDevelop && <button type="button" aria-label={`Remove ${l.repo} #${l.number}`} onClick={() => removeGithubLink.mutate(l.id)} className="text-fg3 hover:text-red">✕</button>}
                        </li>
                    ))}
                    {githubLinks.data?.length === 0 && <li className="text-fg3">No linked pull requests.</li>}
                </ul>
                {canDevelop && (
                    <div className="mt-2 flex items-center gap-2">
                        <input aria-label="Add PR URL" value={prUrl} onChange={(e) => setPrUrl(e.target.value)} placeholder="https://github.com/owner/repo/pull/123" className="flex-1 rounded border px-2 py-1 text-sm" />
                        <button type="button" onClick={onAddPr} className="rounded border px-2 py-1 text-sm">Add PR</button>
                        {prError && <span className="text-sm text-red">{prError}</span>}
                    </div>
                )}
            </section>

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">Comments</h2>
                <ul className="space-y-2">
                    {comments.data?.items.map((c) => (
                        <li key={c.id} className="rounded border border-border bg-panel p-2 text-sm">{c.body}</li>
                    ))}
                </ul>
                <form onSubmit={submitComment} className="mt-3 flex gap-2">
                    <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…"
                        aria-label="Add a comment" className="flex-1 rounded border px-2 py-1" />
                    <button type="submit" className="rounded bg-accent px-3 text-white">Send</button>
                </form>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 font-semibold">Activity</h2>
                <ul className="space-y-1 text-sm text-fg2">
                    {activities.data?.items.map((a) => (
                        <li key={a.id}>{a.type}{a.to_value ? `: ${a.to_value}` : ''}</li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
