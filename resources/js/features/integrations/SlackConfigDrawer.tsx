import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../lib/apiClient';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { checkboxStyle, fieldLabel, modalTitle } from '../settings/settingsStyles';
import { useSlackIntegration, useSaveSlackIntegration, useSendSlackTest } from './hooks';
import { ink } from '../../lib/ink';

const EVENT_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'created', label: 'Issue created' },
    { key: 'status_changed', label: 'Status changed' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'commented', label: 'Commented' },
];

const checkRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginTop: 12, cursor: 'pointer' };
/** Status message ("Saved", errors): the colour is a status token, so the text takes its ink partner (4.5:1). */
const msgStyle = (color: string): CSSProperties => ({ fontSize: 13, fontWeight: 600, color: ink(color) });

export function SlackConfigDrawer({ open, onClose }: { open: boolean; onClose(): void }) {
    const slack = useSlackIntegration();
    const save = useSaveSlackIntegration();
    const sendTest = useSendSlackTest();
    const [url, setUrl] = useState('');
    const [events, setEvents] = useState<string[]>([]);
    const [active, setActive] = useState(true);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (slack.data) { setEvents(slack.data.events); setActive(slack.data.is_active); }
    }, [slack.data]);

    function toggle(key: string) {
        setEvents((e) => (e.includes(key) ? e.filter((k) => k !== key) : [...e, key]));
    }
    async function onSave() {
        setMsg(''); setError('');
        try { await save.mutateAsync({ ...(url ? { webhook_url: url } : {}), events, is_active: active }); setMsg('Saved'); setUrl(''); }
        catch (err) { setError(err instanceof ApiError ? err.detail : 'Failed to save.'); }
    }
    async function onTest() {
        setMsg(''); setError('');
        try { await sendTest.mutateAsync(); setMsg('Test sent'); }
        catch (err) { setError(err instanceof ApiError ? err.detail : 'Failed to send test.'); }
    }

    return (
        <Drawer open={open} onClose={onClose} side="right" width={480}>
            <div style={{ padding: '22px 24px' }}>
                <h2 style={{ ...modalTitle, marginBottom: 18 }}>Configure Slack</h2>
                <label style={{ display: 'block' }}>
                    <span style={fieldLabel}>Webhook URL</span>
                    <Input aria-label="Slack webhook URL" type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                        placeholder={slack.data?.configured ? `Configured (${slack.data.url_preview})` : 'https://hooks.slack.com/services/…'} />
                </label>
                <fieldset style={{ border: 'none', margin: '18px 0 0', padding: 0 }}>
                    <legend style={{ ...fieldLabel, padding: 0 }}>Post on</legend>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
                        {EVENT_OPTIONS.map((o) => (
                            <label key={o.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                                <input type="checkbox" aria-label={o.label} checked={events.includes(o.key)} onChange={() => toggle(o.key)} style={checkboxStyle} />
                                {o.label}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <label style={checkRow}>
                    <input type="checkbox" aria-label="Slack active" checked={active} onChange={(e) => setActive(e.target.checked)} style={checkboxStyle} /> Active
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
                    <Button size="sm" onClick={onSave}>Save</Button>
                    <Button variant="secondary" size="sm" onClick={onTest}>Send test</Button>
                    {msg && <span style={msgStyle('var(--green)')}>{msg}</span>}
                    {error && <span style={msgStyle('var(--red)')}>{error}</span>}
                </div>
            </div>
        </Drawer>
    );
}
