import { StatusIcon } from '@prizy/ui';

export const AllStatuses = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="backlog" decorative /> Backlog</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="todo" decorative /> Todo</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="in_progress" decorative /> In Progress</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="in_review" decorative /> In Review</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="done" decorative /> Done</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StatusIcon status="cancelled" decorative /> Cancelled</span>
    </div>
);

export const Sizes = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <StatusIcon status="in_progress" size={12} />
        <StatusIcon status="in_progress" />
        <StatusIcon status="in_progress" size={18} />
        <StatusIcon status="done" size={22} />
    </div>
);
