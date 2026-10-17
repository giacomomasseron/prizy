import { PriorityIcon } from '@prizy/ui';

export const AllPriorities = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="urgent" decorative /> Urgent</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="high" decorative /> High</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="medium" decorative /> Medium</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="low" decorative /> Low</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PriorityIcon priority="no_priority" decorative /> No priority</span>
    </div>
);

export const IconsOnly = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <PriorityIcon priority="urgent" />
        <PriorityIcon priority="high" />
        <PriorityIcon priority="medium" />
        <PriorityIcon priority="low" />
        <PriorityIcon priority="no_priority" />
    </div>
);
