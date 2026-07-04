import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { STATUSES, useTransitionStatus } from './hooks';
import type { Issue, IssueStatus } from '../../lib/types';

export const STATUS_LABELS: Record<IssueStatus, string> = {
    backlog: 'Backlog',
    todo: 'Todo',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled',
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

export function StatusEditor({ issue, canDevelop }: Props) {
    const transition = useTransitionStatus();

    if (!canDevelop) {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg)' }}>
                <StatusIcon status={issue.status} size={14} />
                {STATUS_LABELS[issue.status]}
            </span>
        );
    }

    return (
        <Menu
            trigger={
                <button type="button" aria-label="Change status" style={triggerStyle}>
                    <StatusIcon status={issue.status} size={14} />
                    {STATUS_LABELS[issue.status]}
                </button>
            }
            items={STATUSES.map((s) => ({
                key: s,
                label: STATUS_LABELS[s],
                icon: <StatusIcon status={s} size={14} />,
                onActivate: () => transition.mutateAsync({ id: issue.id, status: s }),
            }))}
        />
    );
}
