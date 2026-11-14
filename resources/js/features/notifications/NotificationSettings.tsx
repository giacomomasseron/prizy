import type { CSSProperties } from 'react';
import { usePreferences, useSetPreference } from './hooks';
import { InboxHeader } from './InboxHeader';
import type { DigestFrequency } from '../settings/hooks';
import { useUpdateNotificationPreferences } from '../settings/hooks';
import { Switch } from '../../components/ui/Switch';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

/** Each event the server lists: its name, when it fires, and the glyph and ink of its kind (as in the list). */
const EVENTS: Record<string, { label: string; hint: string; icon: string; ink: string }> = {
    mention: { label: 'Mentions', hint: 'Someone names you in a comment or description', icon: '@', ink: 'var(--accent-ink)' },
    assign: { label: 'Assignments', hint: 'An issue is assigned to you', icon: '→', ink: 'var(--blue-ink)' },
    comment: { label: 'Comments on followed issues', hint: 'Replies in threads you participate in', icon: '❝', ink: 'var(--fg2)' },
    status: { label: 'Status changes', hint: 'Issues you follow move between states', icon: '◑', ink: 'var(--fg2)' },
    unblocked: { label: 'Unblocked', hint: 'An issue assigned to you is no longer blocked', icon: '◔', ink: 'var(--fg2)' },
};

const DIGEST_OPTIONS = [
    { label: 'Off', value: 'off' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
] as const;

/**
 * The Inbox's settings view (Prizy Notifications.dc.html settings pane), under the same big header as the list: the
 * "Delivery per event" ink card with In-app and Email switches per event, the email digest card, and "Back to inbox".
 * Left out, no backend: the mockup's Slack column, Quiet hours and Escalation override. Email is disabled for a row
 * whose In-app is off: such an event creates no preference row on the server, so email has nothing to deliver. The
 * digest reuses the setter from Settings > General. Presentational: the page owns which view shows and passes `onBack`.
 */
export function NotificationSettings({ onBack }: { onBack: () => void }) {
    const prefs = usePreferences();
    const setPreference = useSetPreference();
    const updateDigest = useUpdateNotificationPreferences();

    const rows = prefs.data?.preferences ?? [];
    const digest = (prefs.data?.email_digest_frequency ?? 'off') as DigestFrequency;
    const column: CSSProperties = { width: 64, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--fg3)' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0 }}>
            <InboxHeader title="Notification settings" sub="How each event reaches you, channel by channel." />
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '2px 40px 40px 34px' }}>
                {prefs.isLoading ? (
                    <div style={{ fontSize: 13.5, color: 'var(--fg3)' }}>Loading…</div>
                ) : (
                    <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 22 }}>
                        <section data-testid="delivery-card" style={{ border: 'var(--line) solid var(--fg)', borderRadius: 22, background: 'var(--panel)', boxShadow: '5px 5px 0 var(--fg)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'var(--bg2)', borderBottom: 'var(--line) solid var(--border)' }}>
                                <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>Delivery per event</span>
                                <span style={column}>In-app</span>
                                <span style={column}>Email</span>
                            </div>

                            {rows.map((row) => {
                                const event = EVENTS[row.event_type] ?? { label: row.event_type, hint: '', icon: '•', ink: 'var(--fg2)' };
                                const emailDisabled = !row.in_app;
                                return (
                                    <div key={row.event_type} className="border-b border-border last:border-b-0" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottomWidth: 'var(--line)' }}>
                                        <span data-testid={`event-icon-${row.event_type}`} aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: event.ink, border: 'var(--line) solid var(--border2)' }}>{event.icon}</span>
                                        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{event.label}</span>
                                            {event.hint && <span style={{ fontSize: 13.5, color: 'var(--fg3)' }}>{event.hint}</span>}
                                        </span>
                                        <span style={{ width: 64, display: 'flex', justifyContent: 'center' }}>
                                            <Switch
                                                checked={row.in_app}
                                                ariaLabel={`${event.label} in-app`}
                                                onChange={() => setPreference.mutate({ event_type: row.event_type, channel: 'in_app', enabled: !row.in_app })}
                                            />
                                        </span>
                                        <span style={{ width: 64, display: 'flex', justifyContent: 'center' }}>
                                            <Switch
                                                checked={row.email}
                                                disabled={emailDisabled}
                                                ariaLabel={`${event.label} email`}
                                                onChange={() => setPreference.mutate({ event_type: row.event_type, channel: 'email', enabled: !row.email })}
                                            />
                                        </span>
                                    </div>
                                );
                            })}
                        </section>

                        <section style={{ maxWidth: 420, border: 'var(--line) solid var(--border2)', borderRadius: 20, background: 'var(--panel)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>Email digest</div>
                            <div style={{ fontSize: 14, color: 'var(--fg3)', lineHeight: 1.55 }}>A rolled-up summary email instead of one email per event.</div>
                            <SegmentedControl
                                options={[...DIGEST_OPTIONS]}
                                value={digest}
                                onChange={(value) => updateDigest.mutate(value as DigestFrequency)}
                            />
                        </section>

                        <button type="button" onClick={onBack} className="border-fg bg-panel text-fg hover:bg-hi hover:text-on-hi" style={{ alignSelf: 'flex-start', borderWidth: 'var(--line)', borderStyle: 'solid', padding: '10px 20px', borderRadius: 'var(--radius-pill)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                            ← Back to inbox
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
