import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useActivities, useAddComment, useComments, useIssue } from './hooks';

export default function IssueDetailPage() {
    const { id = '' } = useParams();
    const issue = useIssue(id);
    const comments = useComments(id);
    const activities = useActivities(id);
    const addComment = useAddComment(id);
    const [body, setBody] = useState('');

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
