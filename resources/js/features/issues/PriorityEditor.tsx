import { Menu } from '../../components/ui/Menu';
import { PriorityIcon } from '../../components/ui/PriorityIcon';
import { useUpdateIssue } from './hooks';
import { PRIORITY_LABELS } from './issueMeta';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue, IssuePriority } from '../../lib/types';

export const PRIORITIES: IssuePriority[] = ['no_priority', 'urgent', 'high', 'medium', 'low'];

export { PRIORITY_LABELS };

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function PriorityEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    const display = (
        <>
            <PriorityIcon priority={issue.priority} />
            {PRIORITY_LABELS[issue.priority]}
        </>
    );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

    return (
        <Menu
            fullWidth
            trigger={
                <button type="button" aria-label="Change priority" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
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
