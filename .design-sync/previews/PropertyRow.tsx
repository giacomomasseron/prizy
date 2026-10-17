import { Avatar, LabelChip, PriorityIcon, ProjectPill, PropertyRow, StatusIcon } from '@prizy/ui';

export const IssueProperties = () => (
    <div style={{ width: 340, padding: 6, background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
        <PropertyRow label="Status">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="in_progress" decorative /> In Progress</span>
        </PropertyRow>
        <PropertyRow label="Priority">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="high" decorative /> High</span>
        </PropertyRow>
        <PropertyRow label="Assignee">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar initials="MC" color="#6d69f2" size={20} /> Maya Chen</span>
        </PropertyRow>
        <PropertyRow label="Labels">
            <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                <LabelChip name="Bug" color="#d93a3f" />
                <LabelChip name="Performance" color="#2f8f88" />
            </span>
        </PropertyRow>
        <PropertyRow label="Project">
            <ProjectPill name="Billing v2" color="#d9623a" />
        </PropertyRow>
    </div>
);

export const WideLabels = () => (
    <div style={{ width: 380, padding: 6, background: 'var(--panel)', border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
        <PropertyRow label="First reply due" labelWidth={130}>in 2h 14m</PropertyRow>
        <PropertyRow label="Requester" labelWidth={130}>Grace Okonkwo</PropertyRow>
        <PropertyRow label="Organization" labelWidth={130}>Northwind Traders</PropertyRow>
    </div>
);
