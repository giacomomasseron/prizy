import { useSearchParams, Link } from 'react-router-dom';
import { useIssueSearch } from './hooks';

const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

export default function SearchPage() {
    const [params, setParams] = useSearchParams();
    const q = params.get('q') ?? '';
    const status = params.get('status') ?? '';
    const page = Number(params.get('page') ?? '1');

    const search = useIssueSearch({ q, status: status || undefined, page });

    function setParam(key: string, value: string) {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        if (key !== 'page') next.delete('page');
        setParams(next, { replace: true });
    }

    return (
        <div className="mx-auto max-w-3xl p-6">
            <h1 className="mb-4 text-xl font-semibold">Search</h1>
            <div className="mb-4 flex gap-2">
                <input
                    aria-label="Search query"
                    value={q}
                    onChange={(e) => setParam('q', e.target.value)}
                    placeholder="Search issues…"
                    className="flex-1 rounded border px-3 py-2"
                />
                <select aria-label="Status" value={status} onChange={(e) => setParam('status', e.target.value)} className="rounded border px-2">
                    <option value="">Any status</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {search.isLoading && <p className="text-sm text-gray-500">Searching…</p>}
            {search.data && search.data.items.length === 0 && <p className="text-sm text-gray-500">No matching issues.</p>}

            <ul className="divide-y rounded border bg-white">
                {search.data?.items.map((i) => (
                    <li key={i.id}>
                        <Link to={`/issues/${i.id}`} className="block px-4 py-2 text-sm hover:bg-gray-50">
                            <span className="font-medium">{i.title}</span>
                            <span className="ml-2 text-xs text-gray-400">{i.status}</span>
                        </Link>
                    </li>
                ))}
            </ul>

            {search.data && search.data.lastPage > 1 && (
                <div className="mt-4 flex items-center gap-3 text-sm">
                    <button type="button" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} className="rounded border px-2 py-1 disabled:opacity-40">Prev</button>
                    <span>Page {search.data.currentPage} of {search.data.lastPage}</span>
                    <button type="button" disabled={page >= search.data.lastPage} onClick={() => setParam('page', String(page + 1))} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
                </div>
            )}
        </div>
    );
}
