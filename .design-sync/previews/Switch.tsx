import { Switch } from '@prizy/ui';

export const States = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Switch checked onChange={() => {}} label="Cooldown" />
        <Switch checked={false} onChange={() => {}} label="Email notifications" />
    </div>
);

export const Disabled = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Switch checked disabled onChange={() => {}} label="Support desk (owner only)" />
        <Switch checked={false} disabled onChange={() => {}} label="Slack alerts" />
    </div>
);

export const SettingsRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: 420, padding: '14px 18px', background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>Support desk</div>
            <div style={{ fontSize: 13, color: 'var(--fg2)' }}>Tickets, the help center and SLAs for this workspace.</div>
        </div>
        <Switch checked onChange={() => {}} ariaLabel="Support desk" />
    </div>
);
