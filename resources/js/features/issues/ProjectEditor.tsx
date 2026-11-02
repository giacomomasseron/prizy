import { Menu } from '../../components/ui/Menu';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { useUpdateIssue } from './hooks';
import { useProjects } from '../projects/hooks';
import { EDITOR_TRIGGER_CLASSES, caretStyle, editorTriggerStyle, editorValueStyle } from './issueStyles';
import type { Issue } from '../../lib/types';

interface Props {
    issue: Issue;
    canDevelop: boolean;
}

export function ProjectEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    // The current project name comes embedded on the issue (works for agents on the bridge,
    // who cannot list projects). The full list is only needed for the editable picker below.
    const projects = useProjects(undefined, { enabled: canDevelop });
    const currentProject = issue.project ?? null;

    const display = currentProject ? (
        <ProjectPill name={currentProject.name} color={currentProject.color} />
    ) : (
        <span style={{ color: 'var(--fg3)' }}>No project</span>
    );

    if (!canDevelop) return <span style={editorValueStyle}>{display}</span>;

    const items = [
        {
            key: 'none',
            label: 'No project',
            onActivate: () => { update.mutateAsync({ project_id: null }); },
        },
        ...(projects.data?.items ?? []).map((p) => ({
            key: p.id,
            label: p.name,
            icon: <ProjectPill name={p.name} color={p.color} />,
            onActivate: () => { update.mutateAsync({ project_id: p.id }); },
        })),
    ];

    return (
        <Menu
            fullWidth
            trigger={
                <button type="button" aria-label="Edit project" className={EDITOR_TRIGGER_CLASSES} style={editorTriggerStyle}>
                    {display}
                    <span aria-hidden="true" style={caretStyle}>▾</span>
                </button>
            }
            items={items}
        />
    );
}
