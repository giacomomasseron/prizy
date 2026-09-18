import { useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { downloadBlob } from '../../lib/downloadBlob';
import { useMe } from '../../auth/useAuth';
import type { DigestFrequency } from './hooks';
import { useUpdateHelpdeskEnabled, useUpdateNotificationPreferences } from './hooks';

export default function GeneralPage() {
    const me = useMe();
    const update = useUpdateNotificationPreferences();
    const updateHelpdesk = useUpdateHelpdeskEnabled();
    const [moduleError, setModuleError] = useState('');
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

    async function switchHelpdesk(enabled: boolean) {
        setModuleError('');
        try {
            await updateHelpdesk.mutateAsync(enabled);
        } catch (err) {
            setModuleError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    async function downloadExport() {
        setExporting(true);
        setExportError('');
        try {
            const res = await fetch('/v1/workspace-export', {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = /filename=([^;]+)/.exec(disposition);
            const filename = match ? match[1].trim().replace(/^"|"$/g, '') : 'prizy-export.zip';
            downloadBlob(filename, blob);
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
            {(me.data?.admin_level === 'owner' || me.data?.admin_level === 'admin') && (
                <section className="mt-4 rounded border border-border bg-panel p-4">
                    <h2 className="mb-2 font-semibold">Modules</h2>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={me.data?.workspace?.helpdesk_enabled ?? false}
                            disabled={updateHelpdesk.isPending}
                            onChange={(e) => switchHelpdesk(e.target.checked)}
                        />
                        Support — help desk, knowledge base and customer portal
                    </label>
                    <p className="mt-2 text-sm text-fg2">
                        Switching this off closes the help centre, the customer portal, the agent desk and
                        knowledge-base authoring for everyone in this workspace. Nothing is deleted — switch it
                        back on and every ticket, contact and article is where you left it.
                    </p>
                    {moduleError && <p className="mt-2 text-sm text-red">{moduleError}</p>}
                </section>
            )}
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
