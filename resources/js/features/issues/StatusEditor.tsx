import { Menu } from '../../components/ui/Menu';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { STATUSES, useTransitionStatus } from './hooks';
import { STATUS_LABELS } from './issueMeta';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue } from '../../lib/types';

// Re-exported: releases/ReleaseDetailPage imports STATUS_LABELS from here.
export { STATUS_LABELS };

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function StatusEditor({ issue, canDevelop }: Props) {
    const transition = useTransitionStatus();
    const display = (
        <>
            <StatusIcon status={issue.status} size={14} />
            {STATUS_LABELS[issue.status]}
        </>
    );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

    return (
        <Menu
            fullWidth
            trigger={
                <button type="button" aria-label="Change status" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
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
