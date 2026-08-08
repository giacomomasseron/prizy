import type { CSSProperties } from 'react';
import { usePreferences, useSetPreference } from './hooks';
import type { DigestFrequency } from '../settings/hooks';
import { useUpdateNotificationPreferences } from '../settings/hooks';
import { Switch } from '../../components/ui/Switch';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

const EVENT_LABEL: Record<string, string> = {
    mention: 'Mentions',
    assign: 'Assignments',
    comment: 'Comments on followed issues',
    status: 'Status changes',
    unblocked: 'Unblocked',
};

const DIGEST_OPTIONS = [
    { label: 'Off', value: 'off' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
] as const;

const headerCell: CSSProperties = {
    fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)',
};

const backBtn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
    border: '1px solid var(--border2)', background: 'transparent', color: 'var(--fg2)',
    fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
};

function eventLabel(eventType: string): string {
    return EVENT_LABEL[eventType] ?? eventType;
}

/**
 * Notifications page settings view (Prizy Notifications.dc.html settings pane):
 * a "Delivery per event" card with In-app + Email toggles per event type (the
 * mockup's Slack column, Quiet hours, and Escalation override are OUT of
 * scope — no backend support), an email digest frequency control, and a
 * "Back to inbox" button. Email is disabled + visually greyed for a row whose
 * In-app is off — an in-app-off event creates no preference row server-side,
 * so email has nothing to deliver (SP4a constraint). Reuses the existing
 * digest setter (`useUpdateNotificationPreferences`, already wired to
 * `PATCH /notifications/preferences` from Settings > General) rather than a
 * new endpoint. Presentational — the parent page (Task 5) owns `view` state
 * and passes `onBack`.
 */
export function NotificationSettings({ onBack }: { onBack: () => void }) {
    const prefs = usePreferences();
    const setPreference = useSetPreference();
    const updateDigest = useUpdateNotificationPreferences();

    if (prefs.isLoading) {
        return <div style={{ padding: 24, fontSize: 12.5, color: 'var(--fg3)' }}>Loading…</div>;
    }

    const rows = prefs.data?.preferences ?? [];
    const digest = (prefs.data?.email_digest_frequency ?? 'off') as DigestFrequency;

    return (
        <div style={{ padding: '20px 24px', maxWidth: 640, height: '100%', overflowY: 'auto' }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>Notification settings</h1>
            <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--fg3)' }}>
                Choose how you want to hear about activity on your issues.
            </p>

            <section style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
                <div
                    style={{
                        display: 'grid', gridTemplateColumns: '1fr 84px 84px', alignItems: 'center', gap: 12,
                        padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                    }}
                >
                    <span style={headerCell}>Delivery per event</span>
                    <span style={{ ...headerCell, textAlign: 'center' }}>In-app</span>
                    <span style={{ ...headerCell, textAlign: 'center' }}>Email</span>
                </div>

                {rows.map((row) => {
                    const label = eventLabel(row.event_type);
                    const emailDisabled = !row.in_app;
                    return (
                        <div
                            key={row.event_type}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr 84px 84px', alignItems: 'center', gap: 12,
                                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                            }}
                        >
                            <span style={{ fontSize: 13, color: 'var(--fg)' }}>{label}</span>
                            <span style={{ display: 'flex', justifyContent: 'center' }}>
                                <Switch
                                    checked={row.in_app}
                                    ariaLabel={`${label} in-app`}
                                    onChange={() => setPreference.mutate({ event_type: row.event_type, channel: 'in_app', enabled: !row.in_app })}
                                />
                            </span>
                            <span style={{ display: 'flex', justifyContent: 'center' }}>
                                <Switch
                                    checked={row.email}
                                    disabled={emailDisabled}
                                    ariaLabel={`${label} email`}
                                    onChange={() => setPreference.mutate({ event_type: row.event_type, channel: 'email', enabled: !row.email })}
                                />
                            </span>
                        </div>
                    );
                })}
            </section>

            <section style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Email digest</div>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--fg3)' }}>
                    A rolled-up summary email instead of one email per event.
                </p>
                <SegmentedControl
                    options={[...DIGEST_OPTIONS]}
                    value={digest}
                    onChange={(value) => updateDigest.mutate(value as DigestFrequency)}
                />
            </section>

            <button type="button" onClick={onBack} style={backBtn}>
                ← Back to inbox
            </button>
        </div>
    );
}
