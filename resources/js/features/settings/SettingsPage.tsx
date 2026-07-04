import { useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import type { DigestFrequency } from './hooks';
import { useUpdateNotificationPreferences } from './hooks';

export default function SettingsPage() {
    const me = useMe();
    const update = useUpdateNotificationPreferences();
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

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

    if (me.isLoading) return <p className="p-6">Loading…</p>;

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-4 text-xl font-semibold">Settings</h1>
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
        </div>
    );
}
