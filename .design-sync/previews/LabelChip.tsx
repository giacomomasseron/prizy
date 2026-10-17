import { LabelChip } from '@prizy/ui';

export const Labels = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <LabelChip name="Bug" color="#d93a3f" />
        <LabelChip name="Feature" color="#5b57e0" />
        <LabelChip name="Billing" color="#a8691c" />
        <LabelChip name="Performance" color="#2f8f88" />
        <LabelChip name="Customer request" color="#3a8f4d" />
    </div>
);

export const OnIssueRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 520, padding: '10px 14px', background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-row)' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--fg3)' }}>PRZ-244</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>CSV export times out on large workspaces</span>
        <LabelChip name="Bug" color="#d93a3f" />
        <LabelChip name="Performance" color="#2f8f88" />
    </div>
);
