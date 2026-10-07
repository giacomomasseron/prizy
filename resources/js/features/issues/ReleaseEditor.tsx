import { Menu } from '../../components/ui/Menu';
import { useUpdateIssue } from './hooks';
import { useReleases } from '../releases/hooks';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue } from '../../lib/types';

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function ReleaseEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    // The current release name comes embedded on the issue (works for agents on the bridge, who
    // cannot list releases). The full list is only needed for the editable picker below.
    const releases = useReleases({ enabled: canDevelop });
    const currentRelease = issue.release ?? null;

    const display = currentRelease ? (
        <span>⛴ {currentRelease.name}{currentRelease.shipped_at ? ' ✓' : ''}</span>
    ) : (
        <span style={{ color: 'var(--fg3)' }}>No release</span>
    );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

    const items = [
        {
            key: 'none',
            label: 'No release',
            onActivate: () => { update.mutateAsync({ release_id: null }); },
        },
        ...(releases.data ?? []).map((r) => ({
            key: r.id,
            label: r.name,
            onActivate: () => { update.mutateAsync({ release_id: r.id }); },
        })),
    ];

    return (
        <Menu
            fullWidth
            trigger={
                <button type="button" aria-label="Edit release" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
