import { usePreferences, useSetPreference } from './hooks';
import type { DigestFrequency } from '../settings/hooks';
import { useUpdateNotificationPreferences } from '../settings/hooks';
import { Switch } from '../../components/ui/Switch';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Button } from '../../components/ui/Button';
import { sectionTitle } from '../issues/issueStyles';
import { deskCard, smallLabel } from '../support/supportStyles';

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
 * and passes `onBack`. v2: display title, a v2 card with sentence-case column labels,
 * and a secondary Button for "Back to inbox".
 */
export function NotificationSettings({ onBack }: { onBack: () => void }) {
    const prefs = usePreferences();
    const setPreference = useSetPreference();
    const updateDigest = useUpdateNotificationPreferences();

    if (prefs.isLoading) {
        return <div style={{ padding: 28, fontSize: 13.5, color: 'var(--fg3)' }}>Loading…</div>;
    }

    const rows = prefs.data?.preferences ?? [];
    const digest = (prefs.data?.email_digest_frequency ?? 'off') as DigestFrequency;

    return (
        <div style={{ padding: '24px 28px', maxWidth: 680, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
            <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--fg)' }}>Notification settings</h1>
            <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--fg2)' }}>
                Choose how you want to hear about activity on your issues.
            </p>

            <section style={{ ...deskCard, overflow: 'hidden', marginBottom: 26 }}>
                <div
                    style={{
                        display: 'grid', gridTemplateColumns: '1fr 84px 84px', alignItems: 'center', gap: 12,
                        padding: '11px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                    }}
                >
                    <span style={smallLabel}>Delivery per event</span>
                    <span style={{ ...smallLabel, textAlign: 'center' }}>In-app</span>
                    <span style={{ ...smallLabel, textAlign: 'center' }}>Email</span>
                </div>

                {rows.map((row) => {
                    const label = eventLabel(row.event_type);
                    const emailDisabled = !row.in_app;
                    return (
                        <div
                            key={row.event_type}
                            className="border-b border-border last:border-b-0"
                            style={{ display: 'grid', gridTemplateColumns: '1fr 84px 84px', alignItems: 'center', gap: 12, padding: '12px 18px' }}
                        >
                            <span style={{ fontSize: 14, color: 'var(--fg)' }}>{label}</span>
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

            <section style={{ marginBottom: 26 }}>
                <div style={{ ...sectionTitle(17), marginBottom: 4 }}>Email digest</div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg3)' }}>
                    A rolled-up summary email instead of one email per event.
                </p>
                <SegmentedControl
                    options={[...DIGEST_OPTIONS]}
                    value={digest}
                    onChange={(value) => updateDigest.mutate(value as DigestFrequency)}
                />
            </section>

            <Button variant="secondary" size="sm" onClick={onBack}>
                ← Back to inbox
            </Button>
        </div>
    );
}
