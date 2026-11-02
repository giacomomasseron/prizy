import { Menu } from '../../components/ui/Menu';
import { LabelChip } from '../../components/ui/LabelChip';
import { useIssueLabels, useSetIssueLabels } from './hooks';
import { useLabels } from '../labels/hooks';
import { toggleExclusive } from '../labels/labelGroups';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue } from '../../lib/types';

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function LabelsEditor({ issue, canDevelop }: Props) {
    // Current labels come from the per-issue endpoint (works for agents on the bridge).
    // The full label list is only needed for the editable picker, so gate it on canDevelop.
    const allLabels = useLabels({ enabled: canDevelop });
    const issueLabels = useIssueLabels(issue.id);
    const setLabels = useSetIssueLabels(issue.id);

    const currentItems = issueLabels.data?.items ?? [];
    const currentIds = new Set(currentItems.map((l) => l.id));

    const display =
        currentItems.length > 0 ? (
            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
                {currentItems.map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
            </span>
        ) : (
            <span style={{ color: 'var(--fg3)' }}>No labels</span>
        );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

    const all = allLabels.data?.items ?? [];
    const items = all.map((l) => ({
        key: l.id,
        label: l.name,
        icon: (
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: l.color,
                    flexShrink: 0,
                    display: 'inline-block',
                }}
            />
        ),
        onActivate: () => {
            setLabels.mutateAsync(toggleExclusive(currentIds, l, all));
        },
    }));

    return (
        <Menu
            fullWidth
            trigger={
                <button type="button" aria-label="Edit labels" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
