import { useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import type { Label } from '../../lib/types';
import { useCreateLabel, useDeleteLabel, useLabels } from './hooks';

export default function LabelsPage() {
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const labels = useLabels();
    const create = useCreateLabel();
    const del = useDeleteLabel();
    const [name, setName] = useState('');
    const [color, setColor] = useState('#94a3b8');
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim()) return;
        try { await create.mutateAsync({ name, color }); setName(''); setColor('#94a3b8'); }
        catch (err) { setError(err instanceof ApiError ? err.detail : 'Failed to create label.'); }
    }

    async function remove(label: Label) {
        setError('');
        if (!window.confirm(`Delete label ${label.name}?`)) return;
        try { await del.mutateAsync(label.id); }
        catch (err) { setError(err instanceof ApiError ? err.detail : 'Failed to delete label.'); }
    }

    return (
        <div className="mx-auto max-w-3xl p-6">
            <h1 className="mb-4 text-xl font-semibold">Labels</h1>

            {canDevelop && (
                <form onSubmit={submit} className="mb-4 flex flex-wrap items-center gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label name…"
                        aria-label="Label name" maxLength={64} className="flex-1 rounded border px-2 py-1" />
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Label color" className="h-8 w-10 rounded border" />
                    <button type="submit" disabled={create.isPending} className="rounded bg-indigo-600 px-3 text-white disabled:opacity-50">Add label</button>
                </form>
            )}
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            {labels.isLoading && <p>Loading…</p>}
            <ul className="divide-y rounded border bg-white">
                {labels.data?.items.map((label) => (
                    <li key={label.id} className="flex items-center justify-between px-4 py-2">
                        <span className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                            {label.name}
                        </span>
                        {canDevelop && <button type="button" onClick={() => remove(label)} className="text-sm text-red-600 hover:underline">Delete</button>}
                    </li>
                ))}
            </ul>
        </div>
    );
}
