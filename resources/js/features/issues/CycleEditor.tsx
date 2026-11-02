import { Menu } from '../../components/ui/Menu';
import { useUpdateIssue } from './hooks';
import { useCycles } from '../teams/hooks';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue } from '../../lib/types';

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function CycleEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    // Current cycle name comes embedded on the issue (agents on the bridge can't list cycles).
    // The list is only needed for the editable picker below.
    const cycles = useCycles(issue.team_id, { enabled: canDevelop });
    const currentCycle = issue.cycle ?? null;

    const display = currentCycle ? (
        <span>{currentCycle.name}</span>
    ) : (
        <span style={{ color: 'var(--fg3)' }}>No cycle</span>
    );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

    const items = [
        {
            key: 'none',
            label: 'No cycle',
            onActivate: () => { update.mutateAsync({ cycle_id: null }); },
        },
        ...(cycles.data?.items ?? []).map((c) => ({
            key: c.id,
            label: c.name,
            onActivate: () => { update.mutateAsync({ cycle_id: c.id }); },
        })),
    ];

    return (
        <Menu
            fullWidth
            trigger={
                <button type="button" aria-label="Edit cycle" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
