import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useSlackIntegration, useSaveSlackIntegration, useSendSlackTest } from './hooks';

const EVENT_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'created', label: 'Issue created' },
    { key: 'status_changed', label: 'Status changed' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'commented', label: 'Commented' },
];

export default function IntegrationsPage() {
    const slack = useSlackIntegration();
    const save = useSaveSlackIntegration();
    const sendTest = useSendSlackTest();

    const [url, setUrl] = useState('');
    const [events, setEvents] = useState<string[]>([]);
    const [active, setActive] = useState(true);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (slack.data) {
            setEvents(slack.data.events);
            setActive(slack.data.is_active);
        }
    }, [slack.data]);

    function toggle(key: string) {
        setEvents((e) => (e.includes(key) ? e.filter((k) => k !== key) : [...e, key]));
    }

    async function onSave() {
        setMsg(''); setError('');
        try {
            await save.mutateAsync({ ...(url ? { webhook_url: url } : {}), events, is_active: active });
            setMsg('Saved'); setUrl('');
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to save.');
        }
    }

    async function onTest() {
        setMsg(''); setError('');
        try {
            await sendTest.mutateAsync();
            setMsg('Test sent');
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to send test.');
        }
    }

    if (slack.isLoading) return <p className="p-6">Loading…</p>;

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-4 text-xl font-semibold">Integrations</h1>
            <section className="rounded border bg-white p-4">
                <h2 className="mb-2 font-semibold">Slack</h2>
                <label className="block text-sm">
                    Webhook URL
                    <input
                        aria-label="Slack webhook URL"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={slack.data?.configured ? `Configured (${slack.data.url_preview})` : 'https://hooks.slack.com/services/…'}
                        className="mt-1 w-full rounded border px-2 py-1"
                    />
                </label>

                <fieldset className="mt-3">
                    <legend className="text-sm text-gray-600">Post on</legend>
                    {EVENT_OPTIONS.map((o) => (
                        <label key={o.key} className="mr-4 inline-flex items-center gap-1 text-sm">
                            <input type="checkbox" aria-label={o.label} checked={events.includes(o.key)} onChange={() => toggle(o.key)} />
                            {o.label}
                        </label>
                    ))}
                </fieldset>

                <label className="mt-3 flex items-center gap-2 text-sm">
                    <input type="checkbox" aria-label="Slack active" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    Active
                </label>

                <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={onSave} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">Save</button>
                    <button type="button" onClick={onTest} className="rounded border px-3 py-1 text-sm">Send test</button>
                    {msg && <span className="text-sm text-green-600">{msg}</span>}
                    {error && <span className="text-sm text-red-600">{error}</span>}
                </div>
            </section>
        </div>
    );
}
