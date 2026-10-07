import { Menu } from '../../components/ui/Menu';
import { Avatar } from '../../components/ui/Avatar';
import { avatarFor } from '../../lib/avatarFor';
import { useAssignIssue } from './hooks';
import { useMembers } from '../members/hooks';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue } from '../../lib/types';

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
            <Avatar initials={av.initials || undefined} color={av.color} size={20} />
            <span>{issue.assignee?.name ?? 'Unassigned'}</span>
        </>
    );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

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
            fullWidth
            trigger={
                <button type="button" aria-label="Edit assignee" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
