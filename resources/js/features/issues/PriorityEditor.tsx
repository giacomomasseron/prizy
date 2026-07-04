import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { useUpdateIssue } from './hooks';
import type { Issue, IssuePriority } from '../../lib/types';

export const PRIORITIES: IssuePriority[] = ['no_priority', 'urgent', 'high', 'medium', 'low'];

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
    no_priority: 'No Priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

const triggerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    background: 'none',
    border: 'none',
    padding: '2px 6px',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'var(--fg)',
    fontFamily: 'inherit',
};

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function PriorityEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);

    if (!canDevelop) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg)' }}>
                <PriorityIcon priority={issue.priority} />
                {PRIORITY_LABELS[issue.priority]}
            </span>
        );
    }

    return (
        <Menu
            trigger={
                <button type="button" aria-label="Change priority" style={triggerStyle}>
                    <PriorityIcon priority={issue.priority} />
                    {PRIORITY_LABELS[issue.priority]}
                </button>
            }
            items={PRIORITIES.map((p) => ({
                key: p,
                label: PRIORITY_LABELS[p],
                icon: <PriorityIcon priority={p} />,
                onActivate: () => update.mutateAsync({ priority: p }),
            }))}
        />
    );
}
