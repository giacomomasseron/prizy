import type { CSSProperties } from 'react';
import { Menu } from '../../components/ui/Menu';
import { ProjectPill } from '../../components/ui/ProjectPill';
import { useUpdateIssue } from './hooks';
import { useProjects } from '../projects/hooks';
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

export function ProjectEditor({ issue, canDevelop }: Props) {
    const update = useUpdateIssue(issue.id);
    const projects = useProjects();
    const currentProject = (projects.data?.items ?? []).find((p) => p.id === issue.project_id);

    const display = currentProject ? (
        <ProjectPill name={currentProject.name} color={currentProject.color} />
    ) : (
        <span style={{ fontSize: 13, color: 'var(--fg3)' }}>No project</span>
    );

    if (!canDevelop) {
        return (
            <span
                style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, color: 'var(--fg)' }}
            >
                {display}
            </span>
        );
    }

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
            trigger={
                <button type="button" aria-label="Edit project" style={triggerStyle}>
                    {display}
                </button>
            }
            items={items}
        />
    );
}
