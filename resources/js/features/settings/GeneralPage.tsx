import { useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import type { DigestFrequency } from './hooks';
import { useUpdateNotificationPreferences } from './hooks';

export default function GeneralPage() {
    const me = useMe();
    const update = useUpdateNotificationPreferences();
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    async function change(value: DigestFrequency) {
        setError('');
        setSaved(false);
        try {
            await update.mutateAsync(value);
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    async function downloadExport() {
        setExporting(true);
        setExportError('');
        try {
            const res = await fetch('/v1/workspace-export', { credentials: 'same-origin' });
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = /filename=([^;]+)/.exec(disposition);
            const filename = match ? match[1].trim().replace(/^"|"$/g, '') : 'prizy-export.zip';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setExportError('Export failed. Try again.');
        } finally {
            setExporting(false);
        }
    }

    if (me.isLoading) return <p className="p-6">Loading…</p>;

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-4 text-xl font-semibold">General</h1>
            <section className="rounded border border-border bg-panel p-4">
                <h2 className="mb-2 font-semibold">Notifications</h2>
                <label className="flex items-center gap-2 text-sm">
                    Email digest
                    <select
                        aria-label="Email digest frequency"
                        value={me.data?.email_digest_frequency ?? 'off'}
                        onChange={(e) => change(e.target.value as DigestFrequency)}
                        className="rounded border border-border px-2 py-1"
                    >
                        <option value="off">Off</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </label>
                {saved && <span className="ml-2 text-sm text-green">Saved</span>}
                {error && <p className="mt-2 text-sm text-red">{error}</p>}
            </section>
            {me.data?.admin_level === 'owner' && (
                <section className="mt-4 rounded border border-border bg-panel p-4">
                    <h2 className="mb-2 font-semibold">Data export</h2>
                    <p className="mb-3 text-sm text-fg2">Everything your team has put into Prizy — yours to take, any time.</p>
                    <button
                        type="button"
                        onClick={downloadExport}
                        disabled={exporting}
                        className="rounded border border-border2 bg-panel px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                    >
                        {exporting ? 'Preparing export…' : 'Download export'}
                    </button>
                    {exportError && <p className="mt-2 text-sm text-red">{exportError}</p>}
                </section>
            )}
        </div>
    );
}
