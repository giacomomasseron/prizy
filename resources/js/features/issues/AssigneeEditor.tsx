import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { useAssignIssue } from './hooks';
import { useMembers } from '../members/hooks';
import type { Issue } from '../../lib/types';

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

export function AssigneeEditor({ issue, canDevelop }: Props) {
    const assign = useAssignIssue(issue.id);
    const members = useMembers();
    const av = avatarFor(issue.assignee ?? null);

    const display = (
        <>
            <Avatar initials={av.initials || undefined} color={av.color} size={16} />
            <span>{issue.assignee?.name ?? 'Unassigned'}</span>
        </>
    );

    if (!canDevelop) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--fg)',
                }}
            >
                {display}
            </span>
        );
    }

    const memberList = members.data ?? [];

    const items = [
        {
            key: 'unassigned',
            label: 'Unassigned',
            icon: <Avatar size={14} />,
            onActivate: () => { assign.mutateAsync(null); },
        },
        ...memberList.map((m) => {
            const mav = avatarFor(m);
            return {
                key: m.id,
                label: m.name,
                icon: <Avatar initials={mav.initials} color={mav.color} size={14} />,
                onActivate: () => { assign.mutateAsync(m.id); },
            };
        }),
    ];

    return (
        <Menu
            trigger={
                <button type="button" aria-label="Edit assignee" style={triggerStyle}>
                    {display}
                </button>
            }
            items={items}
        />
    );
}
